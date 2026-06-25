import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getClaudeClient, HAIKU } from '@/lib/claude'
import { parseJSON } from '@/lib/utils'

interface SubModule { title: string; description: string; objectives: string[]; content?: string }

// POST — generate recall questions for a sub-module
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { subModuleIndex } = await req.json()

  const stage = await prisma.stage.findFirst({
    where: { id },
    include: { roadmap: { select: { topic: true, userId: true } } },
  })
  if (!stage || stage.roadmap.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const subModules = parseJSON<SubModule[]>(stage.subModules, [])
  const sub = subModules[subModuleIndex]
  if (!sub) return NextResponse.json({ error: 'Sub-module not found' }, { status: 404 })

  const client = getClaudeClient()
  const prompt = `You are testing a student's understanding of "${sub.title}" in ${stage.roadmap.topic}.

Generate exactly 3 recall questions to test genuine understanding — not just memorisation.
Mix question types:
- Q1: Conceptual (can they explain WHY, not just WHAT)
- Q2: Application (can they use it in a real scenario)
- Q3: Common misconception (test if they understand what it is NOT or a typical mistake)

Sub-module: ${sub.title}
Description: ${sub.description}
${sub.objectives?.length > 0 ? `Objectives: ${sub.objectives.join('; ')}` : ''}
${sub.content ? `Lesson excerpt: ${sub.content.slice(0, 500)}` : ''}

Return ONLY this JSON array, no markdown:
[
  {
    "question": "string — clear, specific question",
    "type": "conceptual|application|misconception",
    "hint": "string — one sentence hint if they're stuck",
    "sampleAnswer": "string — what a good answer looks like (2-3 sentences)"
  }
]`

  const message = await client.messages.create({
    model: HAIKU,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '[]'
  let questions = []
  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    const s = cleaned.indexOf('['); const e = cleaned.lastIndexOf(']')
    questions = JSON.parse(s !== -1 ? cleaned.slice(s, e + 1) : cleaned)
  } catch { return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 }) }

  return NextResponse.json({ questions, subModuleTitle: sub.title })
}

// PATCH — evaluate answers and record attempt
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const userId = session.user.id as string
  const { subModuleIndex, questions, userAnswers } = await req.json()

  const stage = await prisma.stage.findFirst({
    where: { id },
    include: { roadmap: { select: { topic: true, userId: true } } },
  })
  if (!stage || stage.roadmap.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const subModules = parseJSON<SubModule[]>(stage.subModules, [])
  const sub = subModules[subModuleIndex]

  const client = getClaudeClient()

  // Evaluate all answers at once
  const evalPrompt = `You are evaluating a student's recall quiz on "${sub?.title}" in ${stage.roadmap.topic}.

For each question-answer pair, score the student's answer from 0-100 and give brief feedback.

Questions and expected answers:
${questions.map((q: { question: string; sampleAnswer: string }, i: number) => `Q${i+1}: ${q.question}\nExpected: ${q.sampleAnswer}\nStudent answered: ${userAnswers[i] || '(no answer)'}`).join('\n\n')}

Return ONLY this JSON array:
[
  {
    "score": number (0-100),
    "correct": boolean,
    "feedback": "string — 1 sentence: what they got right or wrong"
  }
]

Be fair but strict. A vague or partially correct answer should score 40-60. A clear, accurate answer scores 80-100. No answer or wrong direction scores 0-30.`

  let results = []
  try {
    const msg = await client.messages.create({
      model: HAIKU, max_tokens: 512,
      messages: [{ role: 'user', content: evalPrompt }],
    })
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    const s = cleaned.indexOf('['); const e = cleaned.lastIndexOf(']')
    results = JSON.parse(s !== -1 ? cleaned.slice(s, e + 1) : cleaned)
  } catch {
    results = questions.map(() => ({ score: 50, correct: true, feedback: 'Answer recorded.' }))
  }

  const avgScore = Math.round(results.reduce((acc: number, r: { score: number }) => acc + r.score, 0) / results.length)
  const passed = avgScore >= 70

  // Save attempt
  await prisma.recallAttempt.create({
    data: {
      userId, stageId: id, subModuleIndex,
      questions: JSON.stringify(questions),
      userAnswers: JSON.stringify(userAnswers),
      score: avgScore, passed,
    },
  })

  // If passed — schedule spaced repetition using SM-2 algorithm
  if (passed) {
    const existing = await prisma.spacedRepetition.findUnique({
      where: { userId_stageId_subModuleIndex: { userId, stageId: id, subModuleIndex } },
    })

    let intervalDays = 1
    let repetitions = 0
    let easeFactor = 2.5

    if (existing) {
      repetitions = existing.repetitions + 1
      // SM-2: quality 0-5 based on score (70+ = quality 3-5)
      const quality = Math.min(5, Math.round((avgScore / 100) * 5))
      easeFactor = Math.max(1.3, existing.easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
      if (quality >= 3) {
        intervalDays = repetitions === 1 ? 1 : repetitions === 2 ? 3 : Math.round(existing.intervalDays * easeFactor)
      } else {
        repetitions = 0; intervalDays = 1
      }
    }

    const nextReviewDate = new Date()
    nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays)

    await prisma.spacedRepetition.upsert({
      where: { userId_stageId_subModuleIndex: { userId, stageId: id, subModuleIndex } },
      create: {
        userId, stageId: id, subModuleIndex,
        subModuleTitle: sub?.title ?? '',
        roadmapTopic: stage.roadmap.topic,
        nextReviewDate, intervalDays, repetitions, easeFactor, lastScore: avgScore,
      },
      update: { nextReviewDate, intervalDays, repetitions, easeFactor, lastScore: avgScore },
    })
  }

  return NextResponse.json({ results, score: avgScore, passed })
}
