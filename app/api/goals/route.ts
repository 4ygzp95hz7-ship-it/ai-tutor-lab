import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTodayDate } from '@/lib/utils'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id as string
  const today = getTodayDate()

  // Today's activity
  const [todayUsage, completedToday, reviewDueCount] = await Promise.all([
    prisma.usageTracking.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.recallAttempt.count({ where: { userId, passed: true, createdAt: { gte: new Date(today) } } }),
    prisma.spacedRepetition.count({ where: { userId, nextReviewDate: { lte: new Date() } } }),
  ])

  const dailyGoal = 2 // sub-modules per day target
  const studiedToday = completedToday
  const pct = Math.min(100, Math.round((studiedToday / dailyGoal) * 100))

  return NextResponse.json({
    goal: dailyGoal,
    studiedToday,
    pct,
    complete: studiedToday >= dailyGoal,
    doubtsAsked: todayUsage?.doubtCount ?? 0,
    reviewDueCount,
  })
}

export async function PATCH(req: NextRequest) {
  // Allow updating daily goal target
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { goal } = await req.json()
  return NextResponse.json({ goal: Math.max(1, Math.min(10, goal)) })
}
