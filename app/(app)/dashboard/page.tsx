'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Flame, Trophy, Clock, Plus, ChevronRight, MessageCircleQuestion, Sparkles } from 'lucide-react'

interface Stage { id: string; status: string }
interface Roadmap { id: string; topic: string; title: string; progressPct: number; status: string; stages: Stage[] }
interface StreakData { currentStreak: number; longestStreak: number }

function ProgressRing({ pct, color, size = 52 }: { pct: number; color: string; size?: number }) {
  const [animated, setAnimated] = useState(false)
  const r = (size / 2) - 4
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  useEffect(() => { const t = setTimeout(() => setAnimated(true), 400); return () => clearTimeout(t) }, [])

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={animated ? offset : circ}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([])
  const [streak, setStreak] = useState<StreakData>({ currentStreak: 0, longestStreak: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/roadmaps').then(r => r.json()),
      fetch('/api/streak').then(r => r.json()),
    ]).then(([rmData, stData]) => {
      setRoadmaps(rmData.roadmaps ?? [])
      setStreak(stData.streak ?? { currentStreak: 0, longestStreak: 0 })
    }).finally(() => setLoading(false))
  }, [])

  const firstName = session?.user?.name?.split(' ')[0] ?? 'there'
  const activeRoadmaps = roadmaps.filter(r => r.status === 'active')
  const totalCompleted = roadmaps.reduce((acc, r) => acc + (r.stages?.filter(s => s.status === 'completed').length ?? 0), 0)

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Greeting */}
      <div className="mb-7 animate-fade-up opacity-0">
        <h1 className="text-2xl font-bold text-gray-900">
          {streak.currentStreak > 0 ? `🔥 ` : ''}{`Welcome back, ${firstName}`}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {activeRoadmaps.length > 0 ? `You have ${activeRoadmaps.length} active roadmap${activeRoadmaps.length > 1 ? 's' : ''}. Keep the momentum going!` : 'Start your first learning roadmap today.'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        {[
          { label: 'Current streak', value: streak.currentStreak, unit: 'days', icon: Flame, iconColor: 'text-orange-500', bg: 'bg-amber-50', delay: 'delay-100' },
          { label: 'Modules studied', value: totalCompleted, unit: 'total', icon: Trophy, iconColor: 'text-blue-500', bg: 'bg-blue-50', delay: 'delay-200' },
          { label: 'Longest streak', value: streak.longestStreak, unit: 'days', icon: Clock, iconColor: 'text-green-500', bg: 'bg-green-50', delay: 'delay-300' },
        ].map((s, i) => (
          <div key={i} className={`bg-white border border-gray-100 rounded-xl p-4 animate-fade-up opacity-0 ${s.delay}`}>
            <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center mb-2`}>
              <s.icon size={16} className={s.iconColor} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{loading ? '—' : s.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Roadmaps */}
      <div className="flex items-center justify-between mb-3 animate-fade-up opacity-0 delay-400">
        <h2 className="font-semibold text-gray-900">Your roadmaps</h2>
        <Link href="/roadmap/new" className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium">
          <Plus size={14} />New roadmap
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : roadmaps.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center animate-scale-in opacity-0">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles size={24} className="text-blue-500" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">No roadmaps yet</h3>
          <p className="text-sm text-gray-500 mb-5">Enter any topic and Claude will build your complete curriculum.</p>
          <Link href="/roadmap/new" className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all hover:scale-105">
            <Sparkles size={14} />Create your first roadmap
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {roadmaps.map((roadmap, idx) => {
            const doneCount = roadmap.stages?.filter(s => s.status === 'completed').length ?? 0
            const totalCount = roadmap.stages?.length ?? 0
            const ringColor = roadmap.status === 'active' ? '#2563eb' : roadmap.status === 'completed' ? '#16a34a' : '#d97706'

            return (
              <Link key={roadmap.id} href={`/roadmap/${roadmap.id}`}
                className={`block bg-white border border-gray-100 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition-all duration-200 group animate-fade-up opacity-0`}
                style={{ animationDelay: `${(idx + 5) * 100}ms` }}
              >
                <div className="flex items-center gap-4">
                  <ProgressRing pct={roadmap.progressPct} color={ringColor} size={52} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-gray-900 truncate text-sm">{roadmap.title}</h3>
                      <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                        roadmap.status === 'active' ? 'bg-blue-50 text-blue-700' :
                        roadmap.status === 'completed' ? 'bg-green-50 text-green-700' :
                        'bg-amber-50 text-amber-700'}`}>
                        {roadmap.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{roadmap.topic} · {totalCount} modules · {doneCount} complete</p>

                    {/* Progress bar */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${roadmap.progressPct}%`, background: ringColor }} />
                      </div>
                    </div>
                  </div>

                  <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-400 transition-colors flex-shrink-0" />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Recent doubts teaser */}
      {roadmaps.length > 0 && (
        <div className="mt-6 animate-fade-up opacity-0 delay-700">
          <Link href="/doubts" className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-gray-200 transition-all group">
            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <MessageCircleQuestion size={16} className="text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">View saved doubts</p>
              <p className="text-xs text-gray-400">All your AI tutor conversations</p>
            </div>
            <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-400 transition-colors" />
          </Link>
        </div>
      )}
    </div>
  )
}
