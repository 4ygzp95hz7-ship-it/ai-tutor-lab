import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const referralCode = await prisma.referralCode.findUnique({ where: { userId: session.user.id } })
  const referralsMade = await prisma.referral.count({
    where: { referrerId: session.user.id, status: 'completed' },
  })

  return NextResponse.json({
    code: referralCode?.code ?? null,
    completedReferrals: referralsMade,
    referralUrl: referralCode ? `${process.env.NEXT_PUBLIC_APP_URL}/ref/${referralCode.code}` : null,
  })
}
