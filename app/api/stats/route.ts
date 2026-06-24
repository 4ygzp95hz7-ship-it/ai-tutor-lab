import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id as string

  const [streak, roadmaps, submissions] = await Promise.all([
    prisma.userStreak.findUnique({ where: { userId } }),
    prisma.roadmap.findMany({
      where: { userId },
      select: { progressPct: true, status: true },
    }),
    prisma.submission.findMany({
      where: { userId },
      select: { score: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  // Calculate confidence score:
  // - New user with no activity: 0
  // - Based on: 60% average submission score + 40% average roadmap progress
  let confidenceScore = 0

  if (roadmaps.length > 0 || submissions.length > 0) {
    const avgProgress = roadmaps.length > 0
      ? roadmaps.reduce((acc, r) => acc + r.progressPct, 0) / roadmaps.length
      : 0

    const avgSubmissionScore = submissions.length > 0
      ? submissions.reduce((acc, s) => acc + s.score, 0) / submissions.length
      : avgProgress // fall back to progress if no submissions yet

    const progressWeight = submissions.length > 0 ? 0.4 : 1.0
    const submissionWeight = submissions.length > 0 ? 0.6 : 0

    confidenceScore = Math.round(
      avgProgress * progressWeight + avgSubmissionScore * submissionWeight
    )
  }

  return NextResponse.json({
    streak: streak ?? { currentStreak: 0, longestStreak: 0, lastActivityDate: '' },
    confidenceScore,
    hasActivity: roadmaps.length > 0,
  })
}
