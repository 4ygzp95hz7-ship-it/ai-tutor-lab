import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Flame, Trophy, Clock, Plus } from 'lucide-react'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [roadmaps, streak] = await Promise.all([
    prisma.roadmap.findMany({
      where: { userId: session.user.id },
      include: { stages: { select: { status: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
    prisma.userStreak.findUnique({ where: { userId: session.user.id } }),
  ])

  const activeRoadmaps = roadmaps.filter(r => r.status === 'active')

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {session.user.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          {activeRoadmaps.length > 0
            ? `You have ${activeRoadmaps.length} active roadmap${activeRoadmaps.length > 1 ? 's' : ''}. Keep going!`
            : 'Start your first learning roadmap today.'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 text-orange-500 mb-2">
            <Flame size={16} />
            <span className="text-xs font-medium text-gray-500">Current streak</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{streak?.currentStreak ?? 0}</div>
          <div className="text-xs text-gray-400 mt-0.5">days</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 text-blue-500 mb-2">
            <Trophy size={16} />
            <span className="text-xs font-medium text-gray-500">Active roadmaps</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{activeRoadmaps.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">in progress</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-500 mb-2">
            <Clock size={16} />
            <span className="text-xs font-medium text-gray-500">Longest streak</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{streak?.longestStreak ?? 0}</div>
          <div className="text-xs text-gray-400 mt-0.5">days</div>
        </div>
      </div>

      {/* Roadmaps */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900">Your roadmaps</h2>
        <Link
          href="/roadmap/new"
          className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} />
          New roadmap
        </Link>
      </div>

      {roadmaps.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">📚</div>
          <h3 className="font-semibold text-gray-900 mb-1">No roadmaps yet</h3>
          <p className="text-sm text-gray-500 mb-4">Enter any topic and we&apos;ll build your complete curriculum.</p>
          <Link href="/roadmap/new" className="inline-block bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Create your first roadmap
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {roadmaps.map(roadmap => {
            const done = roadmap.stages.filter(s => s.status === 'completed').length
            const total = roadmap.stages.length
            return (
              <Link
                key={roadmap.id}
                href={`/roadmap/${roadmap.id}`}
                className="block bg-white border border-gray-100 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{roadmap.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{roadmap.topic} · {total} modules</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    roadmap.status === 'active' ? 'bg-blue-50 text-blue-700' :
                    roadmap.status === 'completed' ? 'bg-green-50 text-green-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {roadmap.status}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${roadmap.progressPct}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-500">{roadmap.progressPct}%</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">{done} of {total} modules completed</p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
