import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { evaluateInterviewAnswer } from '@/lib/claude'
import { parseJSON } from '@/lib/utils'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { questionId, question, answer } = await req.json()

  const interviewSession = await prisma.interviewSession.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!interviewSession) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const result = await evaluateInterviewAnswer(question, answer, interviewSession.topic)

  const existing = parseJSON<object[]>(interviewSession.answers, [])
  const updated = [...existing, { questionId, question, answer, ...result }]

  const scores = updated.map((a: object) => (a as { score: number }).score)
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  await prisma.interviewSession.update({
    where: { id },
    data: { answers: JSON.stringify(updated), score: avgScore },
  })

  return NextResponse.json({ result, avgScore })
}
