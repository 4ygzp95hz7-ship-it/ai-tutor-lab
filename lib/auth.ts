import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role ?? 'user'
        token.onboardingStep = (user as { onboardingStep?: number }).onboardingStep ?? 0
      }
      // Allow client-side update() to refresh onboardingStep in the JWT
      if (trigger === 'update' && session?.onboardingStep !== undefined) {
        token.onboardingStep = session.onboardingStep
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as { role?: string; onboardingStep?: number }).role = token.role as string
        ;(session.user as { role?: string; onboardingStep?: number }).onboardingStep = token.onboardingStep as number
      }
      return session
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return
      await prisma.userStreak.create({ data: { userId: user.id } }).catch(() => {})
      const code = Math.random().toString(36).substring(2, 10).toUpperCase()
      await prisma.referralCode.create({ data: { userId: user.id, code } }).catch(() => {})
    },
  },
})
