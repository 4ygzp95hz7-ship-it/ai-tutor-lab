import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendWelcomeEmail } from '@/lib/email'

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { step } = await req.json()

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { onboardingStep: step },
  })

  if (step === 5 && user.email && user.name) {
    await sendWelcomeEmail(user.email, user.name)
  }

  return NextResponse.json({ onboardingStep: user.onboardingStep })
}
