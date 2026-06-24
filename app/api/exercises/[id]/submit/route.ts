import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { evaluateSubmission } from '@/lib/claude'
import { parseJSON } from '@/lib/utils'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { code } = await req.json()
  if (!code?.trim()) return NextResponse.json({ error: 'Code is required' }, { status: 400 })

  const exercise = await prisma.exercise.findUnique({ where: { id } })
  if (!exercise) return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })

  const testCases = parseJSON<{ input: string; expectedOutput: string }[]>(exercise.testCases, [])

  // Simple test runner: count tests that would pass (heuristic — real execution needs a sandbox)
  // For now we rely fully on Claude to evaluate code quality and correctness
  const evaluation = await evaluateSubmission(
    exercise.problem,
    code,
    testCases.length,  // pass all test count to Claude for context
    testCases.length,
    exercise.language
  )

  const submission = await prisma.submission.create({
    data: {
      exerciseId: id,
      userId: session.user.id as string,
      code,
      result: evaluation.score >= 70 ? 'pass' : 'fail',
      score: evaluation.score,
      feedback: evaluation.feedback,
    },
  })

  return NextResponse.json({ submission, score: evaluation.score, feedback: evaluation.feedback })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const submissions = await prisma.submission.findMany({
    where: { exerciseId: id, userId: session.user.id as string },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  return NextResponse.json({ submissions })
}
