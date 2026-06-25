import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const roadmap = await prisma.roadmap.findFirst({
    where: { id, userId: session.user.id as string },
    include: {
      stages: { select: { title: true, status: true, completedSubModules: true, subModules: true } },
      user: { select: { name: true, email: true } },
    },
  })

  if (!roadmap) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const completedStages = roadmap.stages.filter(s => s.status === 'completed').length
  const totalStages = roadmap.stages.length
  const eligibleForCert = roadmap.progressPct >= 80

  if (!eligibleForCert) {
    return NextResponse.json({
      eligible: false,
      progressPct: roadmap.progressPct,
      message: `Complete ${80 - roadmap.progressPct}% more to unlock your certificate.`
    })
  }

  return NextResponse.json({
    eligible: true,
    certificate: {
      recipientName: roadmap.user.name ?? 'Learner',
      topic: roadmap.topic,
      roadmapTitle: roadmap.title,
      completedModules: completedStages,
      totalModules: totalStages,
      completionPct: roadmap.progressPct,
      issuedDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    }
  })
}
