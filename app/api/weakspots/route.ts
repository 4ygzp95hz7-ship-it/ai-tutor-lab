import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id as string

  // Gather signals of struggle
  const [recallAttempts, submissions, chatMessages] = await Promise.all([
    // Recall quiz scores per stage+sub
    prisma.recallAttempt.findMany({
      where: { userId },
      include: { stage: { select: { title: true, roadmapId: true, roadmap: { select: { topic: true } } } } },
      orderBy: { createdAt: 'desc' },
    }),
    // Exercise scores per stage
    prisma.submission.findMany({
      where: { userId, score: { lt: 70 } },
      include: { exercise: { select: { stageId: true, stage: { select: { title: true, roadmap: { select: { topic: true, id: true } } } } } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    // Doubts asked (many doubts = struggle signal)
    prisma.chatMessage.findMany({
      where: { userId, role: 'user' },
      select: { stageId: true, stage: { select: { title: true, roadmap: { select: { topic: true, id: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ])

  // Build weak spot map: stageId → { score, doubtCount, failedRecall, topic, title, roadmapId }
  const spotMap = new Map<string, {
    stageId: string; title: string; topic: string; roadmapId: string
    totalRecallScore: number; recallCount: number; failedRecalls: number
    lowExerciseCount: number; doubtCount: number; weaknessScore: number
  }>()

  // Process recall attempts
  for (const r of recallAttempts) {
    if (!r.stageId || !r.stage) continue
    const key = r.stageId
    const existing = spotMap.get(key) ?? {
      stageId: r.stageId, title: r.stage.title, topic: r.stage.roadmap?.topic ?? '',
      roadmapId: r.stage.roadmapId, totalRecallScore: 0, recallCount: 0,
      failedRecalls: 0, lowExerciseCount: 0, doubtCount: 0, weaknessScore: 0,
    }
    existing.totalRecallScore += r.score
    existing.recallCount += 1
    if (!r.passed) existing.failedRecalls += 1
    spotMap.set(key, existing)
  }

  // Process low exercise scores
  for (const s of submissions) {
    const stage = s.exercise?.stage
    if (!stage) continue
    const key = s.exercise.stageId
    const existing = spotMap.get(key) ?? {
      stageId: key, title: stage.title, topic: stage.roadmap?.topic ?? '',
      roadmapId: stage.roadmap?.id ?? '', totalRecallScore: 0, recallCount: 0,
      failedRecalls: 0, lowExerciseCount: 0, doubtCount: 0, weaknessScore: 0,
    }
    existing.lowExerciseCount += 1
    spotMap.set(key, existing)
  }

  // Process doubts (many questions = struggle)
  for (const m of chatMessages) {
    if (!m.stageId || !m.stage) continue
    const key = m.stageId
    const existing = spotMap.get(key) ?? {
      stageId: key, title: m.stage.title, topic: m.stage.roadmap?.topic ?? '',
      roadmapId: m.stage.roadmap?.id ?? '', totalRecallScore: 0, recallCount: 0,
      failedRecalls: 0, lowExerciseCount: 0, doubtCount: 0, weaknessScore: 0,
    }
    existing.doubtCount += 1
    spotMap.set(key, existing)
  }

  // Calculate weakness score (higher = weaker)
  const weakSpots = Array.from(spotMap.values()).map(s => {
    const avgRecall = s.recallCount > 0 ? s.totalRecallScore / s.recallCount : 100
    s.weaknessScore = (
      (100 - avgRecall) * 0.5 +           // Low recall score (most weight)
      s.failedRecalls * 8 +               // Each failed recall = 8 pts weak
      s.lowExerciseCount * 5 +            // Low exercise score = 5 pts weak
      Math.min(s.doubtCount * 3, 30)      // Many doubts, capped at 30
    )
    return s
  })
    .filter(s => s.weaknessScore > 15)     // Only flag genuine weak spots
    .sort((a, b) => b.weaknessScore - a.weaknessScore)
    .slice(0, 6)

  return NextResponse.json({ weakSpots })
}
