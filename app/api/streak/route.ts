import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const streak = await prisma.userStreak.findUnique({ where: { userId: session.user.id } })
  return NextResponse.json({ streak: streak ?? { currentStreak: 0, longestStreak: 0, lastActivityDate: '' } })
}
