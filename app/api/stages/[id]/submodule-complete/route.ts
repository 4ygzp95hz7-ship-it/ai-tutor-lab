import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseJSON, getTodayDate } from '@/lib/utils'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { index } = await req.json()
  if (index === undefined) return NextResponse.json({ error: 'index required' }, { status: 400 })

  const stage = await prisma.stage.findFirst({
    where: { id },
    include: { roadmap: { select: { userId: true, id: true } } },
  })

  if (!stage || stage.roadmap.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const subModules = parseJSON<object[]>(stage.subModules, [])
  const completed = parseJSON<number[]>(stage.completedSubModules, [])

  // Add this index if not already there
  const updatedCompleted = completed.includes(index) ? completed : [...completed, index]

  // Check if ALL sub-modules are now completed
  const allDone = subModules.length > 0 && updatedCompleted.length >= subModules.length

  // Update completedSubModules, and auto-complete the stage if all done
  const updated = await prisma.stage.update({
    where: { id },
    data: {
      completedSubModules: JSON.stringify(updatedCompleted),
      ...(allDone ? { status: 'completed' } : {}),
    },
  })

  let progressPct = undefined
  if (allDone) {
    // Recalculate roadmap progress
    const allStages = await prisma.stage.findMany({ where: { roadmapId: stage.roadmap.id } })
    const doneCount = allStages.filter(s => s.id === id ? true : s.status === 'completed').length
    progressPct = Math.round((doneCount / allStages.length) * 100)
    await prisma.roadmap.update({ where: { id: stage.roadmap.id }, data: { progressPct } })

    // Update streak
    const today = getTodayDate()
    await prisma.userStreak.upsert({
      where: { userId: session.user.id as string },
      create: { userId: session.user.id as string, currentStreak: 1, longestStreak: 1, lastActivityDate: today },
      update: { lastActivityDate: today },
    })
  }

  return NextResponse.json({
    completedSubModules: updatedCompleted,
    stageCompleted: allDone,
    progressPct,
  })
}
