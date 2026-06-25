import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateExercise } from '@/lib/claude'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const userId = session.user.id as string

  const stage = await prisma.stage.findFirst({
    where: { id },
    include: {
      roadmap: { select: { topic: true, userId: true } },
      exercises: {
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: { submissions: { where: { userId }, orderBy: { createdAt: 'desc' }, take: 1, select: { score: true } } },
      },
    },
  })

  if (!stage || stage.roadmap.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Return most recent cached exercise if exists and hasn't been submitted yet
  const latestExercise = stage.exercises[0]
  if (latestExercise && latestExercise.submissions.length === 0) {
    return NextResponse.json({ exercise: latestExercise })
  }

  // Difficulty auto-scaling: look at recent submission scores
  const recentScores = stage.exercises
    .flatMap(ex => ex.submissions.map(s => s.score))
    .filter(s => s !== null)

  let difficulty: 'easy' | 'medium' | 'hard' = 'medium'
  if (recentScores.length >= 2) {
    const avg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length
    if (avg >= 85) difficulty = 'hard'      // Consistently excellent → push harder
    else if (avg < 60) difficulty = 'easy'  // Struggling → step back
    else difficulty = 'medium'
  }

  // Get user's experience level and industry domain for personalisation
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { experienceLevel: true, industryDomain: true },
  })

  const generated = await generateExercise(
    stage.roadmap.topic,
    stage.title,
    user?.experienceLevel ?? 'beginner',
    difficulty,
    user?.industryDomain ?? ''
  )

  const exercise = await prisma.exercise.create({
    data: {
      stageId: id,
      title: generated.title,
      problem: generated.problem,
      starterCode: generated.starterCode,
      language: generated.language,
      testCases: JSON.stringify(generated.testCases ?? []),
      hints: JSON.stringify(generated.hints ?? []),
      difficulty: generated.difficulty,
    },
  })

  return NextResponse.json({ exercise, difficulty, adaptedFor: user?.industryDomain || null })
}
