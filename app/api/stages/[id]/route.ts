import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTodayDate } from '@/lib/utils'
import { sendModuleCompleteEmail } from '@/lib/email'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { status } = await req.json()

  const stage = await prisma.stage.findFirst({
    where: { id },
    include: { roadmap: { select: { userId: true, id: true } } },
  })
  if (!stage || stage.roadmap.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updated = await prisma.stage.update({ where: { id }, data: { status } })

  // Recalculate progress
  const allStages = await prisma.stage.findMany({ where: { roadmapId: stage.roadmap.id } })
  const done = allStages.filter(s => s.id === id ? status === 'completed' : s.status === 'completed').length
  const progressPct = Math.round((done / allStages.length) * 100)
  await prisma.roadmap.update({ where: { id: stage.roadmap.id }, data: { progressPct } })

  // Update streak
  const today = getTodayDate()
  await prisma.userStreak.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, currentStreak: 1, longestStreak: 1, lastActivityDate: today },
    update: { lastActivityDate: today },
  })

  // Send module complete email (async, non-blocking)
  if (status === 'completed') {
    const user = await prisma.user.findUnique({ where: { id: session.user.id as string }, select: { email: true, name: true } })
    const nextStage = allStages.find(s => s.orderIndex === stage.orderIndex + 1)
    if (user?.email && user?.name) {
      sendModuleCompleteEmail(user.email, user.name, stage.title, nextStage?.title).catch(() => {})
    }
  }

  return NextResponse.json({ stage: updated, progressPct })
}
