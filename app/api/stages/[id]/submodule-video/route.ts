import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateVideoScript } from '@/lib/claude'
import { createAvatarVideo, getAvatarVideoStatus } from '@/lib/joggai'
import { parseJSON } from '@/lib/utils'

interface SubModule {
  title: string
  description: string
  objectives: string[]
  estimatedHours: number
  resources: { title: string; url: string; type: string }[]
  content?: string
  videoId?: string
  videoStatus?: string
  videoUrl?: string
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { index } = await req.json()
  if (index === undefined || index === null) return NextResponse.json({ error: 'index required' }, { status: 400 })

  const stage = await prisma.stage.findFirst({
    where: { id },
    include: { roadmap: { select: { topic: true, userId: true } } },
  })

  if (!stage || stage.roadmap.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const subModules = parseJSON<SubModule[]>(stage.subModules, [])
  const sub = subModules[index]
  if (!sub) return NextResponse.json({ error: 'Sub-module not found' }, { status: 404 })

  // Already have a finished video
  if (sub.videoStatus === 'completed' && sub.videoUrl) {
    return NextResponse.json({ status: 'completed', videoUrl: sub.videoUrl })
  }

  // A job is already in flight — check on it
  if (sub.videoId && (sub.videoStatus === 'pending' || sub.videoStatus === 'processing')) {
    const result = await getAvatarVideoStatus(sub.videoId)
    subModules[index] = { ...sub, videoStatus: result.status, videoUrl: result.videoUrl ?? '' }
    await prisma.stage.update({ where: { id }, data: { subModules: JSON.stringify(subModules) } })
    return NextResponse.json(result)
  }

  // No job yet — kick one off
  const script = await generateVideoScript(stage.roadmap.topic, sub.title, sub.description, sub.objectives)
  const videoId = await createAvatarVideo(script, `${stage.roadmap.topic} — ${sub.title}`)

  subModules[index] = { ...sub, videoId, videoStatus: 'processing', videoUrl: '' }
  await prisma.stage.update({ where: { id }, data: { subModules: JSON.stringify(subModules) } })

  return NextResponse.json({ status: 'processing' })
}
