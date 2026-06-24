'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Clock, CheckCircle, ChevronRight, Sparkles, Trash2, Play, Pause } from 'lucide-react'

interface Stage { id: string; status: string; title: string; orderIndex: number }
interface Roadmap {
  id: string; topic: string; title: string; description: string
  progressPct: number; status: string; stages: Stage[]; createdAt: string
}

const TOPIC_EMOJI: Record<string, string> = {
  'machine learning': '🤖', 'react': '⚛️', 'python': '🐍', 'javascript': '🟨',
  'typescript': '🔷', 'system design': '🏗️', 'data structures': '🌲', 'aws': '☁️',
  'kubernetes': '☸️', 'node.js': '🟢', 'sql': '🗄️', 'rust': '🦀', 'go': '🐹',
}
function getEmoji(topic: string) {
  const lower = topic.toLowerCase()
  return Object.entries(TOPIC_EMOJI).find(([k]) => lower.includes(k))?.[1] ?? '📚'
}

const RING_COLORS = ['#2563eb', '#d97706', '#16a34a', '#9333ea', '#dc2626', '#0891b2']

function ProgressRing({ pct, color, size = 56 }: { pct: number; color: string; size?: number }) {
  const [anim, setAnim] = useState(false)
  const r = (size / 2) - 5
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  useEffect(() => { const t = setTimeout(() => setAnim(true), 200); return () => clearTimeout(t) }, [pct])
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="4.5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4.5"
          strokeDasharray={circ} strokeDashoffset={anim ? offset : circ}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
      </div>
    </div>
  )
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default function RoadmapListPage() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([])
  const [selected, setSelected] = useState<Roadmap | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'completed'>('all')

  useEffect(() => {
    fetch('/api/roadmaps')
      .then(r => r.json())
      .then(({ roadmaps: rms }) => {
        const sorted = (rms ?? []).sort((a: Roadmap, b: Roadmap) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setRoadmaps(sorted)
        if (sorted.length > 0) setSelected(sorted[0])
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = roadmaps.filter(r => filter === 'all' || r.status === filter)

  return (
    <div className="flex h-full overflow-hidden bg-gray-50">

      {/* LEFT: list panel */}
      <div className="flex flex-col bg-white border-r border-gray-100 overflow-hidden" style={{ width: '420px', minWidth: '420px' }}>

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-base font-bold text-gray-900">My roadmaps</h1>
              <p className="text-xs text-gray-400 mt-0.5">{roadmaps.length} total · {roadmaps.filter(r => r.status === 'active').length} active</p>
            </div>
            <Link href="/roadmap/new" className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              <Plus size={13} /> New
            </Link>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5">
            {(['all', 'active', 'paused', 'completed'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-full capitalize font-medium transition-all ${filter === f ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 p-8">
              <Sparkles size={28} className="text-gray-200" />
              <p className="text-sm text-center">No {filter === 'all' ? '' : filter} roadmaps yet.<br/>
                <Link href="/roadmap/new" className="text-blue-600 hover:underline">Create one →</Link>
              </p>
            </div>
          ) : (
            filtered.map((rm, idx) => {
              const isSelected = selected?.id === rm.id
              const color = RING_COLORS[roadmaps.indexOf(rm) % RING_COLORS.length]
              const done = rm.stages?.filter(s => s.status === 'completed').length ?? 0
              const total = rm.stages?.length ?? 0

              return (
                <button key={rm.id} onClick={() => setSelected(rm)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 text-left transition-all ${isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50 border-l-2 border-l-transparent'}`}>

                  <div className="text-2xl flex-shrink-0">{getEmoji(rm.topic)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900 truncate">{rm.title}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rm.status === 'active' ? 'bg-blue-50 text-blue-700' : rm.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                        {rm.status}
                      </span>
                      <span className="text-xs text-gray-400">{total} modules</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{timeAgo(rm.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${rm.progressPct}%`, background: color }} />
                      </div>
                      <span className="text-xs font-medium" style={{ color }}>{rm.progressPct}%</span>
                    </div>
                  </div>

                  <ChevronRight size={14} className={`flex-shrink-0 transition-colors ${isSelected ? 'text-blue-400' : 'text-gray-200'}`} />
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* RIGHT: preview pane */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            <div className="text-center"><Sparkles size={32} className="mx-auto mb-3 text-gray-200" /><p className="text-sm">Select a roadmap</p></div>
          </div>
        ) : (() => {
          const color = RING_COLORS[roadmaps.indexOf(selected) % RING_COLORS.length]
          const done = selected.stages?.filter(s => s.status === 'completed').length ?? 0
          const total = selected.stages?.length ?? 0
          const inProgress = selected.stages?.find(s => s.status === 'in_progress')
          const sortedStages = [...(selected.stages ?? [])].sort((a, b) => a.orderIndex - b.orderIndex)

          return (
            <div className="max-w-lg mx-auto px-8 py-8">
              {/* Roadmap header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-3xl flex-shrink-0">
                  {getEmoji(selected.topic)}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-900 mb-1">{selected.title}</h2>
                  <p className="text-sm text-gray-500 line-clamp-2">{selected.description || `A comprehensive ${selected.topic} learning path.`}</p>
                </div>
              </div>

              {/* Progress ring + stats */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-5 flex items-center gap-5">
                <ProgressRing pct={selected.progressPct} color={color} size={64} />
                <div className="flex-1 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Complete', value: `${done}/${total}`, sub: 'modules' },
                    { label: 'Status', value: selected.status, sub: timeAgo(selected.createdAt) },
                    { label: 'Progress', value: `${selected.progressPct}%`, sub: 'overall' },
                  ].map((s, i) => (
                    <div key={i} className="text-center bg-gray-50 rounded-xl p-3">
                      <div className="text-sm font-bold text-gray-900 capitalize">{s.value}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA buttons */}
              <div className="flex gap-2 mb-6">
                <Link href={`/roadmap/${selected.id}`} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-blue-700 transition-colors">
                  <Play size={14} />
                  {selected.status === 'active' ? 'Continue learning' : 'Open roadmap'}
                </Link>
                <button className="flex items-center gap-1.5 border border-gray-200 text-gray-600 text-sm px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  {selected.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                  {selected.status === 'active' ? 'Pause' : 'Resume'}
                </button>
              </div>

              {/* Current position */}
              {inProgress && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-blue-600 font-medium">Currently studying</p>
                    <p className="text-sm text-blue-800 font-semibold">{inProgress.title}</p>
                  </div>
                  <Link href={`/roadmap/${selected.id}`} className="text-xs text-blue-600 font-medium hover:underline whitespace-nowrap">
                    Continue →
                  </Link>
                </div>
              )}

              {/* Module list */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Modules ({total})</h3>
                  <span className="text-xs text-gray-400">{done} complete</span>
                </div>
                <div className="space-y-1.5">
                  {sortedStages.map((stage, si) => {
                    const isDone = stage.status === 'completed'
                    const isActive = stage.status === 'in_progress'
                    return (
                      <div key={stage.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${isDone ? 'opacity-60' : isActive ? 'bg-blue-50/50' : ''}`}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-green-500 border-green-500' : isActive ? 'border-blue-500' : 'border-gray-200'}`}>
                          {isDone && <CheckCircle size={10} className="text-white" />}
                          {isActive && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                        </div>
                        <span className={`text-sm flex-1 ${isDone ? 'line-through text-gray-400' : isActive ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                          {stage.title}
                        </span>
                        {isActive && <span className="text-xs text-blue-500 font-medium">In progress</span>}
                        {si >= done && !isDone && !isActive && <Clock size={11} className="text-gray-300" />}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
