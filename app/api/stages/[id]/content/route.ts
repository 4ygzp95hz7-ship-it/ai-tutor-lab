import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getClaudeClient, SONNET } from '@/lib/claude'

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

  // Return cached content if already generated
  if (stage.content && stage.content.length > 50) {
    return NextResponse.json({ content: stage.content })
  }

  const client = getClaudeClient()

  const prompt = `You are an expert tutor teaching "${stage.roadmap.topic}". Write a complete, detailed lesson for this module:

Module: "${stage.title}"
Description: ${stage.description}

Write a thorough lesson that includes:
1. **Introduction** — What is this topic and why does it matter?
2. **Core Concepts** — Explain each concept clearly with real-world analogies
3. **Code Examples** — Show practical code with line-by-line explanation (use \`\`\`language blocks)
4. **Common Mistakes** — What beginners get wrong and how to avoid it
5. **Key Takeaways** — Bullet points of what the student should now know

Format: Use markdown. Write as a knowledgeable, friendly tutor. Be thorough — this is what the student will read to learn. Minimum 500 words.`

  const message = await client.messages.create({
    model: SONNET,
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0].type === 'text' ? message.content[0].text : ''

  // Cache to DB — never regenerate
  await prisma.stage.update({ where: { id }, data: { content } })

  return NextResponse.json({ content })
}
