import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getClaudeClient, HAIKU } from '@/lib/claude'
import { parseJSON } from '@/lib/utils'

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

  // Return cached sub-modules if already generated
  const existing = parseJSON<object[]>(stage.subModules, [])
  if (existing.length > 0) {
    return NextResponse.json({ subModules: existing })
  }

  // Generate sub-modules for this specific stage
  const client = getClaudeClient()
  const prompt = `Generate 3-4 sub-modules for this learning module:

Topic: ${stage.roadmap.topic}
Module: "${stage.title}"
Description: ${stage.description}

Return ONLY this JSON array, no markdown:
[
  {
    "title": "string",
    "description": "string (1 sentence, max 15 words)",
    "objectives": ["string", "string"],
    "estimatedHours": number,
    "resources": [
      {"title": "string", "url": "https://...", "type": "docs"},
      {"title": "string — a real YouTube video title from 3Blue1Brown/freeCodeCamp/Traversy Media/MIT OCW/Fireship/CS Dojo", "url": "https://www.youtube.com/watch?v=VALID_VIDEO_ID", "type": "video"}
    ]
  }
]

Rules:
- 3-4 sub-modules that logically break down the parent module
- Each sub-module: 2 objectives, 1 docs resource + 1 video resource
- For the video: use ONLY real YouTube video IDs you are confident exist from these channels: 3Blue1Brown, freeCodeCamp, Traversy Media, MIT OpenCourseWare, Fireship, CS Dojo, Sentdex. If unsure, use freeCodeCamp's channel search URL: https://www.youtube.com/results?search_query=freeCodeCamp+${encodeURIComponent(stage.title)}
- estimatedHours: 1-4 per sub-module
- Return ONLY the JSON array, complete and valid`

  const message = await client.messages.create({
    model: HAIKU,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '[]'
  let cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim()
  const arrStart = cleaned.indexOf('[')
  const arrEnd = cleaned.lastIndexOf(']')
  if (arrStart !== -1 && arrEnd !== -1) cleaned = cleaned.slice(arrStart, arrEnd + 1)

  let subModules = []
  try {
    subModules = JSON.parse(cleaned)
  } catch {
    return NextResponse.json({ error: 'Failed to generate sub-modules' }, { status: 500 })
  }

  // Cache to DB so we never regenerate
  await prisma.stage.update({
    where: { id },
    data: { subModules: JSON.stringify(subModules) },
  })

  return NextResponse.json({ subModules })
}
