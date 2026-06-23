import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messageId, rating, reason, freetext, feature } = await req.json()

  const feedback = await prisma.aiFeedback.upsert({
    where: { messageId },
    create: { messageId, userId: session.user.id, rating, reason: reason ?? '', freetext: freetext ?? '', feature: feature ?? 'doubt' },
    update: { rating, reason: reason ?? '', freetext: freetext ?? '' },
  })

  return NextResponse.json({ feedback })
}
