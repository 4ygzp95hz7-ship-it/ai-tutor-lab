import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendReviewDueEmail } from '@/lib/email'
import { getTodayDate } from '@/lib/utils'

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron (or our own secret)
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = getTodayDate()
  const todayStart = new Date(`${today}T00:00:00.000Z`)

  const due = await prisma.spacedRepetition.findMany({
    where: { nextReviewDate: { lte: new Date() } },
    include: { user: { select: { id: true, email: true, name: true } } },
  })

  const byUser = new Map<string, { email: string; name: string; titles: string[] }>()
  for (const item of due) {
    if (!item.user.email || !item.user.name) continue
    const entry = byUser.get(item.user.id)
    if (entry) entry.titles.push(item.subModuleTitle)
    else byUser.set(item.user.id, { email: item.user.email, name: item.user.name, titles: [item.subModuleTitle] })
  }

  let emailsSent = 0
  for (const [userId, { email, name, titles }] of byUser) {
    // Don't remind the same user more than once per day
    const alreadyReminded = await prisma.emailLog.findFirst({
      where: { userId, type: 'review_due', sentAt: { gte: todayStart } },
    })
    if (alreadyReminded) continue

    await sendReviewDueEmail(email, name, titles.length, titles)
    await prisma.emailLog.create({ data: { userId, type: 'review_due' } })
    emailsSent++
  }

  return NextResponse.json({ ok: true, usersDue: byUser.size, emailsSent, checkedAt: today })
}
