'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Plus, Flame, Clock, TrendingUp, BookOpen, ChevronRight, Code, MessageCircleQuestion, Sparkles, Brain, RefreshCw } from 'lucide-react'

interface Stage { id: string; status: string }
interface Roadmap { id: string; topic: string; title: string; progressPct: number; status: string; stages: Stage[]; createdAt: string }
interface StreakData { currentStreak: number; longestStreak: number; lastActivityDate: string }

function ProgressRing({ pct, color, size = 52 }: { pct: number; color: string; size?: number }) {
  const [animated, setAnimated] = useState(false)
  const r = (size / 2) - 4
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 300); return () => clearTimeout(t) }, [])
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={animated ? offset : circ}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
      </div>
    </div>
  )
}

const TOPIC_EMOJI: Record<string, string> = {
  'machine learning': '🤖', 'react': '⚛️', 'python': '🐍', 'javascript': '🟨',
  'typescript': '🔷', 'system design': '🏗️', 'data structures': '🌲', 'aws': '☁️',
  'kubernetes': '☸️', 'node': '🟢', 'sql': '🗄️', 'default': '📚',
}
function getEmoji(topic: string) {
  const lower = topic.toLowerCase()
  return Object.entries(TOPIC_EMOJI).find(([k]) => lower.includes(k))?.[1] ?? TOPIC_EMOJI.default
}

const RING_COLORS = ['#2563eb', '#d97706', '#16a34a', '#9333ea', '#dc2626', '#0891b2']

export default function DashboardPage() {
  const { data: session } = useSession()
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([])
  const [streak, setStreak] = useState<StreakData>({ currentStreak: 0, longestStreak: 0, lastActivityDate: '' })
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null)
  const [reviewDue, setReviewDue] = useState<{ id: string; subModuleTitle: string; roadmapTopic: string; stage: { id: string; roadmapId: string } }[]>([])
  const [weakSpots, setWeakSpots] = useState<{ stageId: string; title: string; topic: string; roadmapId: string; weaknessScore: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/roadmaps').then(r => r.json()),
      fetch('/api/stats').then(r => r.json()),
      fetch('/api/review').then(r => r.json()),
      fetch('/api/weakspots').then(r => r.json()),
    ]).then(([rmData, statsData, reviewData, wsData]) => {
      setRoadmaps(rmData.roadmaps ?? [])
      setStreak(statsData.streak ?? { currentStreak: 0, longestStreak: 0, lastActivityDate: '' })
      setConfidenceScore(statsData.hasActivity ? statsData.confidenceScore : null)
      setReviewDue(reviewData.due ?? [])
      setWeakSpots(wsData.weakSpots ?? [])
    }).finally(() => setLoading(false))
  }, [])

  const firstName = session?.user?.name?.split(' ')[0] ?? 'there'
  const totalModules = roadmaps.reduce((acc, r) => acc + (r.stages?.filter(s => s.status === 'completed').length ?? 0), 0)
  const activeCount = roadmaps.filter(r => r.status === 'active').length

  const kpis = [
    { label: 'Active roadmaps', value: loading ? '—' : String(activeCount), sub: `${roadmaps.length} total`, icon: TrendingUp, iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
    { label: 'Modules studied', value: loading ? '—' : String(totalModules), sub: 'All time', icon: BookOpen, iconBg: 'bg-green-50', iconColor: 'text-green-600' },
    { label: 'Current streak', value: loading ? '—' : String(streak.currentStreak), sub: `Longest: ${streak.longestStreak} days`, icon: Flame, iconBg: 'bg-amber-50', iconColor: 'text-orange-500' },
    { label: 'Confidence score', value: loading ? '—' : confidenceScore !== null ? String(confidenceScore) : '—', sub: confidenceScore !== null ? 'Based on your progress' : 'Complete modules to unlock', icon: TrendingUp, iconBg: 'bg-purple-50', iconColor: 'text-purple-600' },
  ]

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {streak.currentStreak > 0 ? `🔥 ` : ''}Good to see you, {firstName}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {activeCount > 0 ? `${activeCount} active roadmap${activeCount > 1 ? 's' : ''} in progress` : 'Start your first learning roadmap today.'}
            </p>
          </div>
          <Link href="/roadmap/new" className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={15} /> New roadmap
          </Link>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-4 gap-4 mb-7">
          {kpis.map((k, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl p-4 animate-fade-up opacity-0" style={{ animationDelay: `${i * 80}ms` }}>
              <div className={`w-8 h-8 ${k.iconBg} rounded-lg flex items-center justify-center mb-3`}>
                <k.icon size={15} className={k.iconColor} />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-0.5">{k.value}</div>
              <div className="text-xs text-gray-500 font-medium mb-0.5">{k.label}</div>
              <div className="text-xs text-gray-400">{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Roadmaps grid */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-800">Your roadmaps</h2>
          <Link href="/roadmap" className="text-xs text-blue-600 hover:underline">View all →</Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 mb-7">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : roadmaps.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center mb-7">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Sparkles size={22} className="text-blue-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1 text-sm">No roadmaps yet</h3>
            <p className="text-xs text-gray-500 mb-4">Type any topic — Claude builds your complete curriculum.</p>
            <Link href="/roadmap/new" className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors">
              <Sparkles size={12} /> Create first roadmap
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-7">
            {roadmaps.map((rm, idx) => {
              const done = rm.stages?.filter(s => s.status === 'completed').length ?? 0
              const total = rm.stages?.length ?? 0
              const color = RING_COLORS[idx % RING_COLORS.length]
              const emoji = getEmoji(rm.topic)
              const statusColor = rm.status === 'active' ? 'bg-blue-50 text-blue-700' : rm.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'

              return (
                <Link key={rm.id} href={`/roadmap/${rm.id}`}
                  className="bg-white border border-gray-100 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition-all duration-200 group animate-fade-up opacity-0"
                  style={{ animationDelay: `${(idx + 4) * 80}ms` }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                      {emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{rm.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{rm.status}</span>
                        <span className="text-xs text-gray-400">{total} modules</span>
                      </div>
                    </div>
                    <ProgressRing pct={rm.progressPct} color={color} size={48} />
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${rm.progressPct}%`, background: color }} />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{done} of {total} modules complete</span>
                    <span className="text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      {rm.status === 'active' ? 'Continue' : 'View'} <ChevronRight size={11} />
                    </span>
                  </div>
                </Link>
              )
            })}

            {/* Add new card */}
            <Link href="/roadmap/new" className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-4 flex items-center justify-center gap-2 hover:border-blue-300 hover:bg-blue-50/30 transition-all group">
              <Plus size={18} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
              <span className="text-sm text-gray-400 group-hover:text-blue-600 transition-colors font-medium">New roadmap</span>
            </Link>
          </div>
        )}

        {/* Spaced repetition — due for review */}
        {reviewDue.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Brain size={15} className="text-blue-600" />
              <h2 className="text-sm font-semibold text-gray-800">Due for review</h2>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{reviewDue.length}</span>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs text-blue-600 mb-3">Spaced repetition — these sub-modules are scheduled for review today to lock in long-term retention.</p>
              <div className="space-y-2">
                {reviewDue.slice(0, 4).map((item, i) => (
                  <Link key={i} href={`/roadmap/${item.stage.roadmapId}`}
                    className="flex items-center gap-3 bg-white border border-blue-100 rounded-lg px-3 py-2.5 hover:border-blue-300 transition-colors">
                    <RefreshCw size={13} className="text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.subModuleTitle}</p>
                      <p className="text-xs text-gray-400">{item.roadmapTopic}</p>
                    </div>
                    <span className="text-xs text-blue-600 font-medium flex-shrink-0">Review →</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Weak spots */}
        {weakSpots.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Brain size={15} className="text-amber-500" />
              <h2 className="text-sm font-semibold text-gray-800">Concepts to strengthen</h2>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-xs text-amber-700 mb-3">These topics show signs of struggle — low recall scores, many doubts, or low exercise scores.</p>
              <div className="space-y-2">
                {weakSpots.slice(0, 3).map((ws, i) => (
                  <Link key={i} href={`/roadmap/${ws.roadmapId}`}
                    className="flex items-center gap-3 bg-white border border-amber-100 rounded-lg px-3 py-2.5 hover:border-amber-300 transition-colors">
                    <Brain size={13} className="text-amber-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{ws.title}</p>
                      <p className="text-xs text-gray-400">{ws.topic}</p>
                    </div>
                    <span className="text-xs text-amber-600 font-medium flex-shrink-0">Review →</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-800">Quick actions</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { href: '/practice', icon: Code, label: 'Practice exercises', desc: 'AI-generated coding challenges', bg: 'bg-green-50', color: 'text-green-600' },
            { href: '/doubts', icon: MessageCircleQuestion, label: 'Saved doubts', desc: 'Your AI tutor conversations', bg: 'bg-purple-50', color: 'text-purple-600' },
            { href: '/interview', icon: TrendingUp, label: 'Interview prep', desc: 'AI-graded Q&A practice', bg: 'bg-rose-50', color: 'text-rose-600' },
          ].map((a, i) => (
            <Link key={i} href={a.href} className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-sm transition-all group">
              <div className={`w-8 h-8 ${a.bg} rounded-lg flex items-center justify-center mb-3`}>
                <a.icon size={15} className={a.color} />
              </div>
              <div className="text-sm font-medium text-gray-800 mb-0.5">{a.label}</div>
              <div className="text-xs text-gray-400">{a.desc}</div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}
