'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Clock, CheckCircle, Lock, Loader2, MessageSquare, ChevronRight, BookOpen, Flame, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn, parseJSON } from '@/lib/utils'
import { ChatPanel } from '@/components/chat/ChatPanel'
import toast from 'react-hot-toast'

interface SubModule {
  title: string
  description: string
  objectives: string[]
  estimatedHours: number
  resources: { title: string; url: string; type: string }[]
  content?: string
}

interface Stage {
  id: string
  title: string
  description: string
  objectives: string[]
  subModules: SubModule[]
  completedSubModules: number[]
  resources: { title: string; url: string; type: string }[]
  estimatedHours: number
  status: string
  orderIndex: number
}

interface Roadmap {
  id: string
  title: string
  topic: string
  progressPct: number
  stages: Stage[]
}

export default function RoadmapPage() {
  const params = useParams()
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeStage, setActiveStage] = useState<Stage | null>(null)
  const [activeSubIdx, setActiveSubIdx] = useState(0)
  const [chatOpen, setChatOpen] = useState(false)
  const [loadingLesson, setLoadingLesson] = useState(false)
  const [loadingSubs, setLoadingSubs] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)

  const loadSubModules = useCallback(async (stage: Stage) => {
    if (stage.subModules?.length > 0) return stage
    setLoadingSubs(stage.id)
    try {
      const res = await fetch(`/api/stages/${stage.id}/submodules`, { method: 'POST' })
      const { subModules } = await res.json()
      const updated = { ...stage, subModules: subModules ?? [] }
      setRoadmap(prev => prev ? {
        ...prev, stages: prev.stages.map(s => s.id === stage.id ? updated : s)
      } : prev)
      return updated
    } catch { return stage }
    finally { setLoadingSubs(null) }
  }, [])

  const loadLesson = useCallback(async (stageId: string, subIdx: number, sub: SubModule) => {
    if (sub.content && sub.content.length > 50) return
    setLoadingLesson(true)
    try {
      const res = await fetch(`/api/stages/${stageId}/submodule-lesson`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index: subIdx }),
      })
      const { content } = await res.json()
      if (content) {
        setRoadmap(prev => prev ? {
          ...prev, stages: prev.stages.map(s => s.id === stageId ? {
            ...s, subModules: s.subModules.map((sm, i) => i === subIdx ? { ...sm, content } : sm)
          } : s)
        } : prev)
        setActiveStage(prev => prev?.id === stageId ? {
          ...prev, subModules: prev.subModules.map((sm, i) => i === subIdx ? { ...sm, content } : sm)
        } : prev)
      }
    } catch {}
    finally { setLoadingLesson(false) }
  }, [])

  useEffect(() => {
    fetch(`/api/roadmaps/${params.id}`)
      .then(r => r.json())
      .then(async ({ roadmap: rm }) => {
        setRoadmap(rm)
        const inProgress = rm.stages?.find((s: Stage) => s.status === 'in_progress') ?? rm.stages?.[0]
        if (inProgress) {
          const loaded = await loadSubModules(inProgress)
          setActiveStage(loaded)
          setActiveSubIdx(loaded.completedSubModules?.length ?? 0)
          if (loaded.subModules?.[loaded.completedSubModules?.length ?? 0]) {
            loadLesson(loaded.id, loaded.completedSubModules?.length ?? 0, loaded.subModules[loaded.completedSubModules?.length ?? 0])
          }
        }
      })
      .catch(() => toast.error('Failed to load roadmap'))
      .finally(() => setLoading(false))
  }, [params.id, loadSubModules, loadLesson])

  async function selectStage(stage: Stage) {
    const loaded = await loadSubModules(stage)
    setActiveStage(loaded)
    const firstUndone = loaded.subModules?.findIndex((_sm: SubModule, i: number) => !(loaded.completedSubModules ?? []).includes(i)) ?? 0
    const idx = firstUndone === -1 ? 0 : firstUndone
    setActiveSubIdx(idx)
    if (loaded.subModules?.[idx]) loadLesson(loaded.id, idx, loaded.subModules[idx])
  }

  async function selectSub(idx: number) {
    if (!activeStage) return
    setActiveSubIdx(idx)
    const sub = activeStage.subModules?.[idx]
    if (sub) loadLesson(activeStage.id, idx, sub)
  }

  async function markStudied() {
    if (!activeStage) return
    setCompleting(true)
    try {
      const res = await fetch(`/api/stages/${activeStage.id}/submodule-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index: activeSubIdx }),
      })
      const { completedSubModules, stageCompleted, progressPct } = await res.json()

      const updatedStage = { ...activeStage, completedSubModules, status: stageCompleted ? 'completed' : activeStage.status }
      setActiveStage(updatedStage)
      setRoadmap(prev => prev ? {
        ...prev,
        progressPct: progressPct ?? prev.progressPct,
        stages: prev.stages.map(s => s.id === activeStage.id ? updatedStage : s),
      } : prev)

      if (stageCompleted) {
        toast.success('Module complete! 🎉')
        const nextStage = roadmap?.stages.find(s => s.orderIndex === activeStage.orderIndex + 1)
        if (nextStage) setTimeout(() => selectStage(nextStage), 800)
      } else {
        toast.success('Marked as studied ✓')
        const nextIdx = activeSubIdx + 1
        if (nextIdx < (activeStage.subModules?.length ?? 0)) {
          setActiveSubIdx(nextIdx)
          loadLesson(activeStage.id, nextIdx, activeStage.subModules[nextIdx])
        }
      }
    } catch { toast.error('Failed to save') }
    finally { setCompleting(false) }
  }

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <Loader2 size={24} className="animate-spin text-blue-500" />
        <p className="text-sm">Loading your roadmap…</p>
      </div>
    </div>
  )

  if (!roadmap) return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center"><p className="text-gray-500 mb-3">Roadmap not found.</p><Link href="/roadmap" className="text-blue-600 hover:underline text-sm">← Back</Link></div>
    </div>
  )

  const activeSub = activeStage?.subModules?.[activeSubIdx]
  const completedSubs = activeStage?.completedSubModules ?? []
  const totalSubs = activeStage?.subModules?.length ?? 0
  const subProgress = totalSubs > 0 ? (completedSubs.length / totalSubs) * 100 : 0
  const isSubDone = completedSubs.includes(activeSubIdx)

  return (
    <div className="flex h-full overflow-hidden">

      {/* LEFT NAV — slim module + sub tree */}
      <aside className="w-56 min-w-56 bg-white border-r border-gray-100 flex flex-col overflow-hidden">
        {/* Roadmap header */}
        <div className="p-3 border-b border-gray-100 flex-shrink-0">
          <Link href="/roadmap" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-2 transition-colors">
            <ArrowLeft size={12} /> All roadmaps
          </Link>
          <h2 className="text-xs font-semibold text-gray-900 leading-snug line-clamp-2">{roadmap.title}</h2>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${roadmap.progressPct}%` }} />
            </div>
            <span className="text-xs font-medium text-blue-600">{roadmap.progressPct}%</span>
          </div>
        </div>

        {/* Module list */}
        <div className="flex-1 overflow-y-auto py-1">
          {roadmap.stages.map((stage, idx) => {
            const isActive = activeStage?.id === stage.id
            const isDone = stage.status === 'completed'
            const isLocked = stage.status === 'not_started' && idx > 0 && roadmap.stages[idx - 1]?.status !== 'completed'
            const stageCompleted = stage.completedSubModules ?? []
            const stageSubs = stage.subModules?.length ?? 0

            return (
              <div key={stage.id}>
                {/* Module row */}
                <button
                  onClick={() => !isLocked && selectStage(stage)}
                  disabled={isLocked}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors',
                    isActive ? 'bg-blue-50' : 'hover:bg-gray-50',
                    isLocked && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <div className={cn('w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
                    isDone ? 'bg-green-100' : isActive ? 'bg-blue-100' : 'bg-gray-100')}>
                    {isDone ? <CheckCircle size={11} className="text-green-600" />
                      : isLocked ? <Lock size={10} className="text-gray-400" />
                      : <span className={cn('text-xs font-bold', isActive ? 'text-blue-600' : 'text-gray-400')}>{idx + 1}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs font-medium leading-snug truncate', isActive ? 'text-blue-700' : isDone ? 'text-gray-500' : 'text-gray-700')}>
                      {stage.title}
                    </p>
                    {stageSubs > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">{stageCompleted.length}/{stageSubs}</p>
                    )}
                  </div>
                </button>

                {/* Sub-module tree (only for active stage) */}
                {isActive && stage.subModules?.length > 0 && (
                  <div className="pl-8 pb-1">
                    {stage.subModules.map((sub, si) => {
                      const subDone = completedSubs.includes(si)
                      const subActive = si === activeSubIdx
                      return (
                        <button key={si} onClick={() => selectSub(si)}
                          className={cn('w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors',
                            subActive ? 'bg-blue-100' : 'hover:bg-gray-50')}>
                          <div className={cn('w-3 h-3 rounded-full border flex-shrink-0 flex items-center justify-center',
                            subDone ? 'bg-green-500 border-green-500' : subActive ? 'border-blue-500 bg-white' : 'border-gray-300 bg-white')}>
                            {subDone && <CheckCircle size={8} className="text-white" />}
                          </div>
                          <span className={cn('text-xs leading-snug truncate flex-1',
                            subDone ? 'text-gray-400 line-through' : subActive ? 'text-blue-700 font-medium' : 'text-gray-600')}>
                            {sub.title}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
                {isActive && loadingSubs === stage.id && (
                  <div className="pl-8 py-2 flex items-center gap-2 text-xs text-blue-500">
                    <Loader2 size={11} className="animate-spin" /> Loading…
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </aside>

      {/* RIGHT — full reading pane */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">

        {!activeStage ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center"><BookOpen size={32} className="mx-auto mb-3 text-gray-200" /><p className="text-sm">Select a module to start reading</p></div>
          </div>
        ) : (
          <>
            {/* Sub-module progress strip */}
            <div className="h-1 bg-gray-100 flex-shrink-0">
              <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${subProgress}%` }} />
            </div>

            {/* Header */}
            <div className="border-b border-gray-100 px-8 py-5 flex-shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Breadcrumb */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                    <BookOpen size={11} />
                    <span>{activeStage.title}</span>
                    <ChevronRight size={11} />
                    <span className="text-gray-600 font-medium">{activeSub?.title ?? 'Select sub-module'}</span>
                  </div>

                  {/* Title */}
                  <h1 className="text-2xl font-semibold text-gray-900 mb-3 leading-tight">
                    {activeSub?.title ?? activeStage.title}
                  </h1>

                  {/* Sub-module pills */}
                  {totalSubs > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {activeStage.subModules.map((sub, si) => {
                        const done = completedSubs.includes(si)
                        const active = si === activeSubIdx
                        return (
                          <button key={si} onClick={() => selectSub(si)}
                            className={cn('flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all',
                              done ? 'bg-green-50 border-green-200 text-green-700' :
                              active ? 'bg-blue-600 border-blue-600 text-white' :
                              'bg-white border-gray-200 text-gray-600 hover:border-gray-300')}>
                            {done && <CheckCircle size={10} />}
                            {sub.title}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Meta + Ask AI */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  {activeSub && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full">
                      <Clock size={11} />{activeSub.estimatedHours}h
                    </div>
                  )}
                  <button onClick={() => setChatOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
                    <MessageSquare size={11} /> Ask AI
                  </button>
                </div>
              </div>
            </div>

            {/* Lesson content */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              {/* Objectives strip */}
              {(activeSub?.objectives?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2 mb-6 pb-6 border-b border-gray-100">
                  {activeSub?.objectives?.map((obj, i) => (
                    <span key={i} className="text-xs bg-gray-50 border border-gray-100 text-gray-600 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                      <span className="text-blue-500">✓</span>{obj}
                    </span>
                  ))}
                </div>
              )}

              {/* Lesson body */}
              {loadingLesson ? (
                <div className="flex flex-col items-center gap-4 py-16 text-gray-400">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <div className="text-center">
                    <p className="text-sm text-blue-600 font-medium">Generating your lesson…</p>
                    <p className="text-xs text-gray-400 mt-1">Claude is writing a focused lesson for this sub-module</p>
                  </div>
                </div>
              ) : activeSub?.content ? (
                <div className="prose prose-gray max-w-none
                  prose-headings:font-semibold prose-headings:text-gray-900 prose-headings:mt-6 prose-headings:mb-3
                  prose-h2:text-lg prose-h3:text-base
                  prose-p:text-gray-600 prose-p:leading-relaxed prose-p:mb-4
                  prose-code:bg-gray-100 prose-code:text-blue-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
                  prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-xl prose-pre:text-sm prose-pre:leading-relaxed
                  prose-strong:text-gray-800 prose-strong:font-semibold
                  prose-ul:text-gray-600 prose-ol:text-gray-600
                  prose-li:mb-1 prose-li:leading-relaxed
                  prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeSub.content}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                  <BookOpen size={32} className="text-gray-200" />
                  <p className="text-sm">Click a sub-module pill above to load its lesson</p>
                </div>
              )}

              {/* Resources */}
              {(activeSub?.resources?.length ?? 0) > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Resources</h4>
                  <div className="flex flex-wrap gap-2">
                    {activeSub?.resources?.map((r, i) => (
                      <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
                        <ExternalLink size={10} />{r.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="border-t border-gray-100 px-8 py-4 flex items-center gap-3 flex-shrink-0 bg-white">
              <button
                onClick={() => { if (activeSubIdx > 0) selectSub(activeSubIdx - 1) }}
                disabled={activeSubIdx === 0}
                className="text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                ← Previous
              </button>

              {!isSubDone ? (
                <button onClick={markStudied} disabled={completing || !activeSub?.content || loadingLesson}
                  className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {completing ? <><Loader2 size={14} className="animate-spin" />Saving…</> : <><CheckCircle size={14} />Mark as studied</>}
                </button>
              ) : (
                <div className="flex items-center gap-2 text-sm text-green-600 font-medium bg-green-50 border border-green-200 px-5 py-2 rounded-lg">
                  <CheckCircle size={14} /> Studied
                </div>
              )}

              <button
                onClick={() => { if (activeSubIdx < totalSubs - 1) selectSub(activeSubIdx + 1) }}
                disabled={activeSubIdx >= totalSubs - 1}
                className="text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                Next →
              </button>

              {/* Sub-module progress indicator */}
              <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
                <Flame size={13} className="text-orange-400" />
                <span>{completedSubs.length} of {totalSubs} studied</span>
              </div>
            </div>
          </>
        )}
      </div>

      <ChatPanel open={chatOpen} stageId={activeStage?.id} onClose={() => setChatOpen(false)} sessionId={`roadmap-${roadmap.id}`} />
    </div>
  )
}
