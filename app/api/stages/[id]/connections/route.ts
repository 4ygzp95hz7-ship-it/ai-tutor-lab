import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getClaudeClient, HAIKU } from '@/lib/claude'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const stage = await prisma.stage.findFirst({
    where: { id },
    include: {
      roadmap: {
        include: {
          stages: { select: { id: true, title: true, status: true, orderIndex: true }, orderBy: { orderIndex: 'asc' } }
        }
      }
    }
  })
  if (!stage || stage.roadmap.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const allStages = stage.roadmap.stages
  const currentIdx = allStages.findIndex(s => s.id === id)

  // Immediate neighbours
  const prev = currentIdx > 0 ? allStages[currentIdx - 1] : null
  const next = currentIdx < allStages.length - 1 ? allStages[currentIdx + 1] : null

  // Use Claude to identify conceptual connections (not just sequential)
  const client = getClaudeClient()
  const prompt = `For "${stage.title}" in a ${stage.roadmap.topic} curriculum, identify which of these other modules it directly connects to conceptually (not just sequentially).

Other modules: ${allStages.filter(s => s.id !== id).map(s => s.title).join(', ')}

Return ONLY a JSON array of module titles that have direct conceptual relationships (max 4):
["module title 1", "module title 2"]

Only include modules where understanding one genuinely helps understand the other. Return [] if none are strongly connected beyond sequential order.`

  let conceptualLinks: string[] = []
  try {
    const msg = await client.messages.create({
      model: HAIKU, max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    const s = cleaned.indexOf('['); const e = cleaned.lastIndexOf(']')
    const titles: string[] = JSON.parse(s !== -1 ? cleaned.slice(s, e + 1) : cleaned)
    conceptualLinks = titles.filter(t => typeof t === 'string')
  } catch { conceptualLinks = [] }

  const connections = allStages
    .filter(s => s.id !== id && conceptualLinks.includes(s.title))
    .map(s => ({ ...s, connectionType: 'conceptual' as const }))

  return NextResponse.json({
    current: { id: stage.id, title: stage.title, status: stage.status },
    prev: prev ? { ...prev, connectionType: 'prerequisite' as const } : null,
    next: next ? { ...next, connectionType: 'next' as const } : null,
    conceptual: connections,
  })
}
