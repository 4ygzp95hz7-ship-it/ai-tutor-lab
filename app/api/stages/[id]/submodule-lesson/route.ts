import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getClaudeClient, SONNET } from '@/lib/claude'
import { parseJSON } from '@/lib/utils'

interface SubModule {
  title: string
  description: string
  objectives: string[]
  estimatedHours: number
  resources: { title: string; url: string; type: string }[]
  content?: string
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

  // Return cached content if already generated
  if (sub.content && sub.content.length > 50) {
    return NextResponse.json({ content: sub.content })
  }

  const client = getClaudeClient()
  const prompt = `You are an expert tutor teaching "${stage.roadmap.topic}". Write a focused, practical lesson for this specific sub-module:

Parent module: "${stage.title}"
Sub-module: "${sub.title}"
Description: ${sub.description}
Learning objectives:
${sub.objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}

Write a complete lesson that covers exactly this sub-module — not the whole module. Include:
1. **Introduction** — what is this and why it matters (2-3 sentences)
2. **Core Concept** — clear explanation with a real-world analogy
3. **Code Example** — practical code with brief explanation (use \`\`\`language blocks)
4. **Key Takeaway** — 2-3 bullet points of what the student now knows

Keep it focused and concise — 300-500 words. Use markdown. Write as a friendly, knowledgeable tutor.`

  const message = await client.messages.create({
    model: SONNET,
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0].type === 'text' ? message.content[0].text : ''

  // Cache the content back into the subModules JSON
  subModules[index] = { ...sub, content }
  await prisma.stage.update({
    where: { id },
    data: { subModules: JSON.stringify(subModules) },
  })

  return NextResponse.json({ content })
}
