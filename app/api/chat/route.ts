import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getClaudeClient, SONNET, buildDoubtSystemPrompt, ChatContext } from '@/lib/claude'
import { checkAndIncrementUsage } from '@/lib/guardrails'
import { parseJSON } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id as string
  const { message, stageId, sessionId } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'Message is required' }, { status: 400 })

  const { allowed } = await checkAndIncrementUsage(userId, 'doubt')
  if (!allowed) {
    return NextResponse.json(
      { error: 'Daily doubt limit reached. Upgrade to Pro for unlimited questions.' },
      { status: 429 }
    )
  }

  // Load stage context
  let ctx: ChatContext = {
    topic: 'General', stageTitle: 'General', stageDescription: '',
    objectives: [], userLevel: 'beginner', recentMessages: [],
  }

  if (stageId) {
    const stage = await prisma.stage.findFirst({
      where: { id: stageId },
      include: { roadmap: { select: { topic: true } } },
    })
    if (stage) {
      ctx = {
        ...ctx,
        topic: stage.roadmap.topic,
        stageTitle: stage.title,
        stageDescription: stage.description,
        objectives: parseJSON<string[]>(stage.objectives, []),
      }
    }
  }

  // Load conversation history (last 10 messages)
  const history = await prisma.chatMessage.findMany({
    where: { userId, sessionId: sessionId ?? 'default' },
    orderBy: { createdAt: 'asc' },
    take: 10,
    select: { role: true, content: true },
  })

  ctx.recentMessages = history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content }))

  // Save user message
  await prisma.chatMessage.create({
    data: { userId, stageId: stageId ?? null, sessionId: sessionId ?? 'default', role: 'user', content: message },
  })

  const client = getClaudeClient()
  const systemPrompt = buildDoubtSystemPrompt(ctx)
  const encoder = new TextEncoder()
  let fullResponse = ''

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claudeStream = client.messages.stream({
          model: SONNET,
          max_tokens: 1024,
          temperature: 0.3,
          system: systemPrompt,
          messages: [
            ...ctx.recentMessages,
            { role: 'user', content: message },
          ],
        })

        for await (const chunk of claudeStream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            const text = chunk.delta.text
            fullResponse += text
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: text })}\n\n`))
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()

        // Save assistant message async
        await prisma.chatMessage.create({
          data: { userId, stageId: stageId ?? null, sessionId: sessionId ?? 'default', role: 'assistant', content: fullResponse },
        })
      } catch (err) {
        controller.error(err)
      }
    },
  })

  return new NextResponse(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id as string
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId') ?? 'default'

  const messages = await prisma.chatMessage.findMany({
    where: { userId, sessionId },
    orderBy: { createdAt: 'asc' },
    include: { aiFeedback: { select: { rating: true } } },
  })

  return NextResponse.json({ messages })
}
