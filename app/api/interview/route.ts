import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateInterviewQuestions } from '@/lib/claude'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { topic, difficulty = 'medium', count = 10 } = await req.json()
  if (!topic) return NextResponse.json({ error: 'Topic is required' }, { status: 400 })

  const questions = await generateInterviewQuestions(topic, difficulty, count)

  const session_ = await prisma.interviewSession.create({
    data: {
      userId: session.user.id,
      topic,
      difficulty,
      questions: JSON.stringify(questions),
    },
  })

  return NextResponse.json({ session: session_, questions })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sessions = await prisma.interviewSession.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return NextResponse.json({ sessions })
}
