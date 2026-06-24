import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getTodayDate } from '@/lib/utils'

async function getStats() {
  const today = getTodayDate()
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const [
    totalUsers, newToday, newThisWeek,
    totalRoadmaps, roadmapsToday,
    totalStages, completedStages,
    totalDoubts, doubtsToday,
    topTopics, feedbackStats,
    usageToday, recentUsers,
    activeStreaks,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: new Date(today) } } }),
    prisma.user.count({ where: { createdAt: { gte: new Date(weekAgo) } } }),
    prisma.roadmap.count(),
    prisma.roadmap.count({ where: { createdAt: { gte: new Date(today) } } }),
    prisma.stage.count(),
    prisma.stage.count({ where: { status: 'completed' } }),
    prisma.chatMessage.count({ where: { role: 'user' } }),
    prisma.chatMessage.count({ where: { role: 'user', createdAt: { gte: new Date(today) } } }),
    prisma.roadmap.groupBy({ by: ['topic'], _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 8 }),
    prisma.aiFeedback.groupBy({ by: ['rating'], _count: { id: true } }),
    prisma.usageTracking.aggregate({ where: { date: today }, _sum: { doubtCount: true, roadmapCount: true, tokenCount: true } }),
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 8, select: { name: true, email: true, createdAt: true, role: true } }),
    prisma.userStreak.count({ where: { currentStreak: { gt: 0 }, lastActivityDate: { in: [today, yesterday] } } }),
  ])

  const thumbsUp = feedbackStats.find(f => f.rating === 1)?._count?.id ?? 0
  const thumbsDown = feedbackStats.find(f => f.rating === -1)?._count?.id ?? 0
  const totalFeedback = thumbsUp + thumbsDown
  const thumbsUpRate = totalFeedback > 0 ? Math.round((thumbsUp / totalFeedback) * 100) : null

  // Cost estimate: ~$0.003 per doubt message (claude-sonnet)
  const estimatedCostToday = ((usageToday._sum.doubtCount ?? 0) * 0.003 + (usageToday._sum.roadmapCount ?? 0) * 0.024).toFixed(2)

  return {
    totalUsers, newToday, newThisWeek,
    totalRoadmaps,
    totalStages, completedStages,
    completionRate: totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0,
    totalDoubts,
    topTopics,
    thumbsUp, thumbsDown, thumbsUpRate,
    estimatedCostToday,
    doubtsToday: usageToday._sum.doubtCount ?? 0,
    roadmapsToday: usageToday._sum.roadmapCount ?? 0,
    recentUsers,
    activeStreaks,
  }
}

function StatCard({ label, value, sub, color = 'blue' }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colors: Record<string, string> = { blue: 'text-blue-600', green: 'text-green-600', amber: 'text-amber-600', red: 'text-red-600', purple: 'text-purple-600' }
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colors[color] ?? colors.blue}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default async function AdminPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const s = await getStats()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">Real-time stats from production database</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total users" value={s.totalUsers} sub={`+${s.newToday} today · +${s.newThisWeek} this week`} color="blue" />
        <StatCard label="Total roadmaps" value={s.totalRoadmaps} sub={`+${s.roadmapsToday} today`} color="purple" />
        <StatCard label="Total doubts asked" value={s.totalDoubts} sub={`${s.doubtsToday} today`} color="green" />
        <StatCard label="Est. AI cost today" value={`$${s.estimatedCostToday}`} sub="roadmaps + doubts" color="amber" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Module completion rate" value={`${s.completionRate}%`} sub={`${s.completedStages} of ${s.totalStages} stages done`} color="green" />
        <StatCard label="Active streaks" value={s.activeStreaks} sub="active in last 48h" color="amber" />
        <StatCard label="AI thumbs up rate" value={s.thumbsUpRate !== null ? `${s.thumbsUpRate}%` : 'No data'} sub={`${s.thumbsUp} up · ${s.thumbsDown} down`} color={s.thumbsUpRate !== null && s.thumbsUpRate >= 80 ? 'green' : 'amber'} />
        <StatCard label="Roadmaps today" value={s.roadmapsToday} sub={`${s.doubtsToday} doubts today`} color="blue" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Top topics */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Top topics requested</h2>
          <div className="space-y-3">
            {s.topTopics.map((t, i) => {
              const maxCount = s.topTopics[0]._count.id
              const pct = Math.round((t._count.id / maxCount) * 100)
              return (
                <div key={t.topic} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                  <span className="text-sm text-gray-700 w-36 truncate">{t.topic}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-medium text-gray-500 w-6 text-right">{t._count.id}</span>
                </div>
              )
            })}
            {s.topTopics.length === 0 && <p className="text-sm text-gray-400">No roadmaps created yet</p>}
          </div>
        </div>

        {/* Recent users */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Recent signups</h2>
          <div className="space-y-3">
            {s.recentUsers.map(u => (
              <div key={u.email} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700 flex-shrink-0">
                  {u.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{u.name ?? 'Unknown'}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {u.role === 'admin' && <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-medium">admin</span>}
                  <span className="text-xs text-gray-400">
                    {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
            {s.recentUsers.length === 0 && <p className="text-sm text-gray-400">No users yet</p>}
          </div>
        </div>
      </div>

      {/* AI Quality */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">AI quality feedback</h2>
        <p className="text-xs text-gray-400 mb-4">Thumbs up/down from the AI Doubt Assistant responses</p>
        {s.thumbsUp + s.thumbsDown === 0 ? (
          <p className="text-sm text-gray-400">No feedback collected yet — users will see thumbs up/down after AI responses</p>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden flex">
              <div className="h-full bg-green-500 rounded-l-full" style={{ width: `${s.thumbsUpRate}%` }} />
              <div className="h-full bg-red-400 rounded-r-full" style={{ width: `${100 - (s.thumbsUpRate ?? 0)}%` }} />
            </div>
            <span className="text-sm font-semibold text-green-600">{s.thumbsUpRate}% positive</span>
            <span className="text-xs text-gray-400">({s.thumbsUp + s.thumbsDown} total)</span>
          </div>
        )}
      </div>
    </div>
  )
}
