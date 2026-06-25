import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id as string
  const now = new Date()

  // Get all sub-modules due for review
  const due = await prisma.spacedRepetition.findMany({
    where: { userId, nextReviewDate: { lte: now } },
    include: { stage: { select: { id: true, title: true, roadmapId: true } } },
    orderBy: { nextReviewDate: 'asc' },
    take: 10,
  })

  // Get upcoming reviews (next 7 days)
  const upcoming = await prisma.spacedRepetition.findMany({
    where: {
      userId,
      nextReviewDate: { gt: now, lte: new Date(now.getTime() + 7 * 86400000) }
    },
    orderBy: { nextReviewDate: 'asc' },
    take: 20,
  })

  return NextResponse.json({ due, upcoming, dueCount: due.length })
}
