import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateRoadmap } from '@/lib/claude'
import { checkAndIncrementUsage } from '@/lib/guardrails'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const roadmaps = await prisma.roadmap.findMany({
    where: { userId: session.user.id },
    include: { stages: { select: { id: true, title: true, status: true, orderIndex: true, estimatedHours: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ roadmaps })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { topic } = await req.json()
  if (!topic?.trim()) return NextResponse.json({ error: 'Topic is required' }, { status: 400 })

  const { allowed } = await checkAndIncrementUsage(session.user.id, 'roadmap')
  if (!allowed) {
    return NextResponse.json(
      { error: 'Daily roadmap limit reached. Upgrade to Pro for unlimited roadmaps.' },
      { status: 429 }
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { experienceLevel: true },
  })

  const generated = await generateRoadmap(topic.trim(), user?.experienceLevel ?? 'beginner')

  const roadmap = await prisma.roadmap.create({
    data: {
      userId: session.user.id,
      topic: topic.trim(),
      title: generated.title,
      description: generated.description,
      stages: {
        create: generated.stages.map((s, i) => ({
          title: s.title,
          description: s.description,
          objectives: JSON.stringify(s.objectives),
          subModules: JSON.stringify(s.subModules ?? []),
          resources: JSON.stringify(s.resources ?? []),
          estimatedHours: s.estimatedHours,
          orderIndex: i,
          status: i === 0 ? 'in_progress' : 'not_started',
        })),
      },
    },
    include: { stages: { orderBy: { orderIndex: 'asc' } } },
  })

  return NextResponse.json({ roadmap }, { status: 201 })
}
