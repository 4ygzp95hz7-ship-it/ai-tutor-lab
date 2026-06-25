import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getClaudeClient, SONNET } from '@/lib/claude'
import { parseJSON } from '@/lib/utils'

interface SubModule { title: string; description: string; objectives: string[]; content?: string }

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { subModuleIndex, explanation } = await req.json()
  if (!explanation?.trim()) return NextResponse.json({ error: 'Explanation required' }, { status: 400 })

  const stage = await prisma.stage.findFirst({
    where: { id },
    include: { roadmap: { select: { topic: true, userId: true } } },
  })
  if (!stage || stage.roadmap.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const subModules = parseJSON<SubModule[]>(stage.subModules, [])
  const sub = subModules[subModuleIndex]

  const client = getClaudeClient()

  const prompt = `A student is practicing the Feynman technique — explaining a concept in their own words to test understanding.

Concept: "${sub?.title}" in ${stage.roadmap.topic}
What they should know: ${sub?.description}
${sub?.objectives?.length > 0 ? `Key objectives: ${sub.objectives.join('; ')}` : ''}

The student's explanation:
"${explanation}"

Your job: evaluate their explanation honestly and specifically. Do NOT give generic praise.

Return ONLY this JSON:
{
  "score": number (0-100, based on accuracy and completeness),
  "correct": ["string — specific things they got RIGHT, be precise"],
  "gaps": ["string — specific things MISSING or unclear — what they forgot to mention"],
  "misconceptions": ["string — anything they said that is WRONG or misleading"],
  "nextStep": "string — one specific thing to re-read or practice to close the biggest gap",
  "overallFeedback": "string — 2-3 sentences, direct and honest, like a good mentor"
}

Scoring guide:
- 85-100: Accurate, complete, clear — they genuinely understand it
- 70-84: Core concept right but missing important details
- 50-69: Partially correct, key gaps or some confusion
- 30-49: Big gaps or misconceptions — needs to re-read
- 0-29: Fundamentally misunderstood — start over`

  const message = await client.messages.create({
    model: SONNET, max_tokens: 600, temperature: 0.3,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    const s = cleaned.indexOf('{'); const e = cleaned.lastIndexOf('}')
    const result = JSON.parse(s !== -1 ? cleaned.slice(s, e + 1) : cleaned)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Failed to evaluate' }, { status: 500 })
  }
}
