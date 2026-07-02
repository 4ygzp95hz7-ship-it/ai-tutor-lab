import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateVideoScript } from '@/lib/claude'
import { createAvatarVideo, getAvatarVideoStatus } from '@/lib/joggai'
import { parseJSON } from '@/lib/utils'

interface SubModule { title: string; description: string; objectives: string[] }

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const stage = await prisma.stage.findFirst({
    where: { id },
    include: { roadmap: { select: { topic: true, userId: true } } },
  })

  if (!stage || stage.roadmap.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Already have a finished video
  if (stage.videoStatus === 'completed' && stage.videoUrl) {
    return NextResponse.json({ status: 'completed', videoUrl: stage.videoUrl })
  }

  // A job is already in flight — check on it
  if (stage.videoId && (stage.videoStatus === 'pending' || stage.videoStatus === 'processing')) {
    const result = await getAvatarVideoStatus(stage.videoId)
    await prisma.stage.update({
      where: { id },
      data: { videoStatus: result.status, videoUrl: result.videoUrl ?? '' },
    })
    return NextResponse.json(result)
  }

  // No job yet — kick one off
  const subModules = parseJSON<SubModule[]>(stage.subModules, [])
  const objectives = subModules.slice(0, 5).map(s => s.title)
  const script = await generateVideoScript(stage.roadmap.topic, stage.title, stage.description, objectives)
  const videoId = await createAvatarVideo(script, `${stage.roadmap.topic} — ${stage.title}`)

  await prisma.stage.update({
    where: { id },
    data: { videoId, videoStatus: 'processing', videoUrl: '' },
  })

  return NextResponse.json({ status: 'processing' })
}
