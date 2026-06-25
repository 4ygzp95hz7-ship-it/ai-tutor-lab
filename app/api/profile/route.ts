import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id as string },
    select: { name: true, email: true, experienceLevel: true, industryDomain: true, createdAt: true },
  })

  return NextResponse.json({ user })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { experienceLevel, industryDomain } = await req.json()
  const data: Record<string, string> = {}
  if (experienceLevel) data.experienceLevel = experienceLevel
  if (industryDomain !== undefined) data.industryDomain = industryDomain

  const user = await prisma.user.update({
    where: { id: session.user.id as string },
    data,
    select: { name: true, email: true, experienceLevel: true, industryDomain: true },
  })

  return NextResponse.json({ user })
}
