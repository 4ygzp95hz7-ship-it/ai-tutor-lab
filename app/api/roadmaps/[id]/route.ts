import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseJSON } from '@/lib/utils'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const roadmap = await prisma.roadmap.findFirst({
    where: { id, userId: session.user.id },
    include: {
      stages: {
        orderBy: { orderIndex: 'asc' },
        include: { exercises: { select: { id: true, title: true, difficulty: true, language: true } } },
      },
    },
  })

  if (!roadmap) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const formatted = {
    ...roadmap,
    stages: roadmap.stages.map(s => ({
      ...s,
      objectives: parseJSON<string[]>(s.objectives, []),
      subModules: parseJSON<object[]>(s.subModules, []),
      resources: parseJSON<object[]>(s.resources, []),
    })),
  }

  return NextResponse.json({ roadmap: formatted })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const roadmap = await prisma.roadmap.findFirst({ where: { id, userId: session.user.id } })
  if (!roadmap) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.roadmap.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
