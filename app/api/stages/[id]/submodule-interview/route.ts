import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getClaudeClient, HAIKU } from '@/lib/claude'
import { parseJSON } from '@/lib/utils'

interface SubModule {
  title: string; description: string; objectives: string[]
  interviewQuestions?: InterviewQ[]
}

interface InterviewQ {
  question: string
  type: 'conceptual' | 'practical' | 'gotcha'
  difficulty: 'junior' | 'mid' | 'senior'
  keyPoints: string[]
}

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

  // Return cached interview questions
  if (sub.interviewQuestions && sub.interviewQuestions.length > 0) {
    return NextResponse.json({ questions: sub.interviewQuestions })
  }

  const client = getClaudeClient()
  const prompt = `Generate 4 interview questions specifically about "${sub.title}" in ${stage.roadmap.topic}.

These are NOT general topic questions — they must be specifically about this sub-topic.
Mix difficulty levels and types.

Return ONLY this JSON array, no markdown:
[
  {
    "question": "string — the exact interview question",
    "type": "conceptual|practical|gotcha",
    "difficulty": "junior|mid|senior",
    "keyPoints": ["string — key point an ideal answer covers", "string", "string"]
  }
]

Types:
- conceptual: tests understanding of WHY and WHAT (most common)
- practical: "write code to..." or "how would you implement..." (tests skill)
- gotcha: tests edge cases, common mistakes, or nuanced understanding

Make these realistic — the kind FAANG/top-tier companies actually ask about this specific topic.
Return ONLY valid JSON.`

  const message = await client.messages.create({
    model: HAIKU, max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '[]'
  let questions: InterviewQ[] = []
  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    const s = cleaned.indexOf('['); const e = cleaned.lastIndexOf(']')
    questions = JSON.parse(s !== -1 ? cleaned.slice(s, e + 1) : cleaned)
  } catch { return NextResponse.json({ error: 'Failed to generate' }, { status: 500 }) }

  // Cache in subModules JSON
  subModules[subModuleIndex] = { ...sub, interviewQuestions: questions }
  await prisma.stage.update({ where: { id }, data: { subModules: JSON.stringify(subModules) } })

  return NextResponse.json({ questions })
}
