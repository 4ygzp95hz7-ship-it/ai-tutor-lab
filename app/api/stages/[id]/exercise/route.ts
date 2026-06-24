import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateExercise } from '@/lib/claude'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const stage = await prisma.stage.findFirst({
    where: { id },
    include: {
      roadmap: { select: { topic: true, userId: true } },
      exercises: { take: 1, orderBy: { createdAt: 'desc' } },
    },
  })

  if (!stage || stage.roadmap.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Return cached exercise if already generated
  if (stage.exercises.length > 0) {
    return NextResponse.json({ exercise: stage.exercises[0] })
  }

  // Generate a new exercise
  const generated = await generateExercise(stage.roadmap.topic, stage.title, 'beginner')

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

  return NextResponse.json({ exercise })
}
