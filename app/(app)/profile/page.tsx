import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Flame, Trophy, Copy } from 'lucide-react'

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [user, streak, referralCode, referralCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true, experienceLevel: true, createdAt: true } }),
    prisma.userStreak.findUnique({ where: { userId: session.user.id } }),
    prisma.referralCode.findUnique({ where: { userId: session.user.id } }),
    prisma.referral.count({ where: { referrerId: session.user.id, status: 'completed' } }),
  ])

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://aitutorlab.com'
  const referralUrl = referralCode ? `${appUrl}/ref/${referralCode.code}` : null

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>

      {/* Identity */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-700">
          {session.user.name?.[0]?.toUpperCase() ?? 'U'}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{user?.name ?? session.user.name}</p>
          <p className="text-sm text-gray-500">{user?.email ?? session.user.email}</p>
          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full mt-1 inline-block font-medium">Pro plan</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 text-orange-500 mb-2"><Flame size={16} /><span className="text-xs font-medium text-gray-500">Current streak</span></div>
          <div className="text-3xl font-bold text-gray-900">{streak?.currentStreak ?? 0}</div>
          <div className="text-xs text-gray-400 mt-0.5">days · longest: {streak?.longestStreak ?? 0}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 text-blue-500 mb-2"><Trophy size={16} /><span className="text-xs font-medium text-gray-500">Referrals made</span></div>
          <div className="text-3xl font-bold text-gray-900">{referralCount}</div>
          <div className="text-xs text-gray-400 mt-0.5">successful · {referralCount} month{referralCount !== 1 ? 's' : ''} Pro earned</div>
        </div>
      </div>

      {/* Referral */}
      {referralUrl && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-1">Referral program</h2>
          <p className="text-xs text-gray-500 mb-3">Invite friends — you both get 1 month Pro free when they complete their first module.</p>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <span className="flex-1 text-xs font-mono text-gray-700 truncate">{referralUrl}</span>
            <button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors flex-shrink-0">
              <Copy size={12} /> Copy
            </button>
          </div>
        </div>
      )}

      {/* Experience level */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Experience level</h2>
        <div className="flex gap-3">
          {['beginner', 'intermediate', 'advanced'].map(l => (
            <div key={l} className={`px-4 py-2 rounded-lg text-sm border ${user?.experienceLevel === l ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600'}`}>
              {l.charAt(0).toUpperCase() + l.slice(1)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
