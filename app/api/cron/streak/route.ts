import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendStreakRiskEmail } from '@/lib/email'
import { getTodayDate } from '@/lib/utils'

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron (or our own secret)
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = getTodayDate()
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  // Get all streaks that need action
  const streaks = await prisma.userStreak.findMany({
    where: { currentStreak: { gt: 0 } },
    include: { user: { select: { email: true, name: true } } },
  })

  let reset = 0
  let emailsSent = 0

  for (const streak of streaks) {
    const lastActive = streak.lastActivityDate

    // Reset streak if not active today or yesterday
    if (lastActive !== today && lastActive !== yesterday) {
      await prisma.userStreak.update({
        where: { id: streak.id },
        data: { currentStreak: 0 },
      })
      reset++
    }

    // Send re-engagement email at day 3 of inactivity
    if (lastActive === threeDaysAgo && streak.user.email && streak.user.name) {
      await sendStreakRiskEmail(streak.user.email, streak.user.name, streak.currentStreak)
      emailsSent++
    }
  }

  // Also send 7-day inactivity email
  const longestInactive = await prisma.userStreak.findMany({
    where: { lastActivityDate: sevenDaysAgo, currentStreak: 0 },
    include: { user: { select: { email: true, name: true } } },
    take: 50,
  })
  for (const s of longestInactive) {
    if (s.user.email && s.user.name) {
      await sendStreakRiskEmail(s.user.email, s.user.name, 0)
      emailsSent++
    }
  }

  return NextResponse.json({ ok: true, streaksReset: reset, emailsSent, checkedAt: today })
}
