import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getClaudeClient, HAIKU } from '@/lib/claude'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { roadmapId } = await req.json()
  if (!roadmapId) return NextResponse.json({ error: 'roadmapId required' }, { status: 400 })

  const roadmap = await prisma.roadmap.findFirst({
    where: { id: roadmapId, userId: session.user.id as string },
    select: { id: true, topic: true, title: true, progressPct: true },
  })
  if (!roadmap) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (roadmap.progressPct < 60) return NextResponse.json({ error: 'Complete at least 60% of the roadmap first' }, { status: 400 })

  // Return existing project if already generated
  const existing = await prisma.project.findUnique({ where: { roadmapId } })
  if (existing && existing.milestones !== '[]') return NextResponse.json({ project: existing })

  const client = getClaudeClient()
  const prompt = `Create a capstone project plan for someone who just learned "${roadmap.topic}" (roadmap: "${roadmap.title}").

Generate 4-5 project milestones that build toward a complete, portfolio-worthy project.

Return ONLY a JSON array, no markdown:
[
  {
    "title": "string",
    "description": "string (2-3 sentences of what to build)",
    "tasks": ["string", "string", "string"],
    "estimatedHours": number
  }
]

Make the project practical and impressive for a portfolio. Return ONLY valid JSON.`

  const message = await client.messages.create({
    model: HAIKU,
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '[]'
  let milestones = []
  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    const arrStart = cleaned.indexOf('[')
    const arrEnd = cleaned.lastIndexOf(']')
    milestones = JSON.parse(arrStart !== -1 ? cleaned.slice(arrStart, arrEnd + 1) : cleaned)
  } catch { milestones = [] }

  const project = await prisma.project.upsert({
    where: { roadmapId },
    create: {
      roadmapId,
      userId: session.user.id as string,
      title: `${roadmap.topic} Capstone Project`,
      milestones: JSON.stringify(milestones),
      mode: 'guided',
      status: 'in_progress',
    },
    update: { milestones: JSON.stringify(milestones), status: 'in_progress' },
  })

  return NextResponse.json({ project })
}
