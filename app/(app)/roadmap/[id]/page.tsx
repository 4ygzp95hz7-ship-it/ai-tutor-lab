'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Clock, CheckCircle, Lock, Loader2, MessageSquare, ChevronRight, BookOpen, Flame, ExternalLink, Brain, Mic, ChevronDown, XCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { cn, parseJSON } from '@/lib/utils'
import { LessonEnhancedContent } from '@/components/lesson/LessonEnhancedContent'
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
  const [connections, setConnections] = useState<{
    prev: { id: string; title: string; status: string } | null
    next: { id: string; title: string; status: string } | null
    conceptual: { id: string; title: string; status: string }[]
  } | null>(null)

  // Recall quiz state
  const [recallMode, setRecallMode] = useState<'idle' | 'loading' | 'answering' | 'result'>('idle')
  const [recallQuestions, setRecallQuestions] = useState<{ question: string; type: string; hint: string; sampleAnswer: string }[]>([])
  const [recallAnswers, setRecallAnswers] = useState<string[]>(['', '', ''])
  const [recallResults, setRecallResults] = useState<{ score: number; correct: boolean; feedback: string }[]>([])
  const [recallScore, setRecallScore] = useState(0)
  const [recallPassed, setRecallPassed] = useState(false)
  const [showHint, setShowHint] = useState<number | null>(null)

  // Feynman mode state
  const [feynmanMode, setFeynmanMode] = useState(false)
  const [feynmanText, setFeynmanText] = useState('')
  const [feynmanLoading, setFeynmanLoading] = useState(false)
  const [feynmanResult, setFeynmanResult] = useState<{
    score: number; correct: string[]; gaps: string[];
    misconceptions: string[]; nextStep: string; overallFeedback: string
  } | null>(null)

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
    setConnections(null)
    loadConnections(stage.id)
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

  async function loadConnections(stageId: string) {
    try {
      const res = await fetch(`/api/stages/${stageId}/connections`)
      const data = await res.json()
      setConnections(data)
    } catch {}
  }

  async function startRecall() {
    if (!activeStage) return
    setRecallMode('loading')
    setRecallAnswers(['', '', ''])
    setRecallResults([])
    setShowHint(null)
    try {
      const res = await fetch(`/api/stages/${activeStage.id}/recall`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subModuleIndex: activeSubIdx }),
      })
      const { questions } = await res.json()
      setRecallQuestions(questions ?? [])
      setRecallMode('answering')
    } catch { toast.error('Failed to generate quiz'); setRecallMode('idle') }
  }

  async function submitRecall() {
    if (!activeStage) return
    setRecallMode('loading')
    try {
      const res = await fetch(`/api/stages/${activeStage.id}/recall`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subModuleIndex: activeSubIdx, questions: recallQuestions, userAnswers: recallAnswers }),
      })
      const data = await res.json()
      setRecallResults(data.results ?? [])
      setRecallScore(data.score)
      setRecallPassed(data.passed)
      setRecallMode('result')
      if (data.passed) {
        toast.success(`Quiz passed! ${data.score}/100 — sub-module scheduled for review 🎉`)
        await markStudied()
      } else {
        toast.error(`Score: ${data.score}/100 — review the lesson and try again`)
      }
    } catch { toast.error('Failed to submit'); setRecallMode('idle') }
  }

  async function submitFeynman() {
    if (!activeStage || !feynmanText.trim()) return
    setFeynmanLoading(true)
    setFeynmanResult(null)
    try {
      const res = await fetch(`/api/stages/${activeStage.id}/feynman`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subModuleIndex: activeSubIdx, explanation: feynmanText }),
      })
      const data = await res.json()
      setFeynmanResult(data)
    } catch { toast.error('Failed to evaluate') }
    finally { setFeynmanLoading(false) }
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

              {/* Lesson body — enhanced with videos, diagrams, live playground */}
              {loadingLesson ? (
                <div className="flex flex-col items-center gap-4 py-16 text-gray-400">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <div className="text-center">
                    <p className="text-sm text-blue-600 font-medium">Generating your lesson…</p>
                    <p className="text-xs text-gray-400 mt-1">Claude is writing a focused lesson with diagrams and examples</p>
                  </div>
                </div>
              ) : activeSub?.content ? (
                <LessonEnhancedContent
                  content={activeSub.content}
                  resources={activeSub.resources}
                  subModuleTitle={activeSub.title}
                  topic={activeStage?.title}
                />
              ) : (
                <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
                  <BookOpen size={32} className="text-gray-200" />
                  <p className="text-sm">Click a sub-module pill above to load its lesson</p>
                </div>
              )}

              {/* Non-video resources */}
              {(activeSub?.resources?.filter((r: { type: string }) => r.type !== 'video').length ?? 0) > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Resources</h4>
                  <div className="flex flex-wrap gap-2">
                    {activeSub?.resources?.filter((r: { type: string }) => r.type !== 'video').map((r, i) => (
                      <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
                        <ExternalLink size={10} />{r.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Concept connection map */}
            {connections && (connections.prev || connections.next || connections.conceptual.length > 0) && (
              <div className="mx-8 mb-5 bg-gray-50 border border-gray-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Concept connections</p>
                <div className="flex flex-wrap gap-2">
                  {connections.prev && (
                    <div className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 rounded-lg px-3 py-2">
                      <span className="text-gray-400">←</span>
                      <span className="text-gray-400 font-medium">Prerequisite:</span>
                      <span className={cn('font-medium', connections.prev.status === 'completed' ? 'text-green-600' : 'text-gray-600')}>{connections.prev.title}</span>
                    </div>
                  )}
                  {connections.conceptual.map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                      <span className="text-blue-400">↔</span>
                      <span className="text-blue-500 font-medium">Related:</span>
                      <span className="text-blue-700 font-medium">{c.title}</span>
                    </div>
                  ))}
                  {connections.next && (
                    <div className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 rounded-lg px-3 py-2">
                      <span className="text-gray-600 font-medium">Leads to:</span>
                      <span className={cn('font-medium', connections.next.status === 'completed' ? 'text-green-600' : 'text-gray-700')}>{connections.next.title}</span>
                      <span className="text-gray-400">→</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── RETENTION ZONE ── */}
            <div className="border-t border-gray-100 flex-shrink-0 bg-white">

              {/* Feynman mode panel */}
              {feynmanMode && (
                <div className="px-8 py-5 border-b border-gray-100 bg-purple-50/40">
                  <div className="flex items-center gap-2 mb-3">
                    <Mic size={15} className="text-purple-600" />
                    <span className="text-sm font-semibold text-purple-800">Feynman Mode — explain it back</span>
                    <button onClick={() => { setFeynmanMode(false); setFeynmanResult(null); setFeynmanText('') }} className="ml-auto text-gray-400 hover:text-gray-600"><XCircle size={15} /></button>
                  </div>
                  <p className="text-xs text-purple-700 mb-3">Explain <strong>{activeSub?.title}</strong> in your own words, as if teaching a complete beginner. The more specific, the better the feedback.</p>
                  {!feynmanResult ? (
                    <>
                      <textarea value={feynmanText} onChange={e => setFeynmanText(e.target.value)}
                        placeholder="Start explaining the concept…"
                        rows={4} className="w-full border border-purple-200 rounded-xl px-4 py-3 text-sm bg-white outline-none focus:border-purple-400 resize-none mb-3 transition" />
                      <button onClick={submitFeynman} disabled={feynmanLoading || !feynmanText.trim()}
                        className="flex items-center gap-2 bg-purple-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors">
                        {feynmanLoading ? <><Loader2 size={13} className="animate-spin" />Evaluating…</> : <><Brain size={13} />Get feedback</>}
                      </button>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className={cn('flex items-center gap-3 rounded-xl px-4 py-3', feynmanResult.score >= 70 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200')}>
                        <div className={cn('text-2xl font-bold', feynmanResult.score >= 70 ? 'text-green-700' : 'text-amber-700')}>{feynmanResult.score}</div>
                        <div className="flex-1 text-sm text-gray-700 leading-relaxed">{feynmanResult.overallFeedback}</div>
                      </div>
                      {feynmanResult.correct.length > 0 && (
                        <div className="bg-green-50 rounded-lg px-4 py-2.5">
                          <p className="text-xs font-semibold text-green-700 mb-1">✓ Got right</p>
                          {feynmanResult.correct.map((c, i) => <p key={i} className="text-xs text-green-700">{c}</p>)}
                        </div>
                      )}
                      {feynmanResult.gaps.length > 0 && (
                        <div className="bg-amber-50 rounded-lg px-4 py-2.5">
                          <p className="text-xs font-semibold text-amber-700 mb-1">⚠ Missing or unclear</p>
                          {feynmanResult.gaps.map((g, i) => <p key={i} className="text-xs text-amber-700">{g}</p>)}
                        </div>
                      )}
                      {feynmanResult.misconceptions.length > 0 && (
                        <div className="bg-red-50 rounded-lg px-4 py-2.5">
                          <p className="text-xs font-semibold text-red-700 mb-1">✗ Needs correction</p>
                          {feynmanResult.misconceptions.map((m, i) => <p key={i} className="text-xs text-red-700">{m}</p>)}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-4 py-2.5"><strong>Next:</strong> {feynmanResult.nextStep}</p>
                      <button onClick={() => { setFeynmanResult(null); setFeynmanText('') }} className="text-xs text-purple-600 hover:underline flex items-center gap-1"><RefreshCw size={11} />Try again</button>
                    </div>
                  )}
                </div>
              )}

              {/* Recall quiz panel */}
              {recallMode !== 'idle' && (
                <div className="px-8 py-5 border-b border-gray-100 bg-blue-50/40">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain size={15} className="text-blue-600" />
                    <span className="text-sm font-semibold text-blue-800">Recall Quiz — test your understanding</span>
                    {recallMode !== 'loading' && (
                      <button onClick={() => setRecallMode('idle')} className="ml-auto text-gray-400 hover:text-gray-600"><XCircle size={15} /></button>
                    )}
                  </div>

                  {recallMode === 'loading' && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 py-3">
                      <Loader2 size={14} className="animate-spin" />
                      {recallQuestions.length === 0 ? 'Generating questions…' : 'Evaluating your answers…'}
                    </div>
                  )}

                  {recallMode === 'answering' && recallQuestions.map((q, i) => (
                    <div key={i} className="mb-5 last:mb-0">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold flex-shrink-0 mt-0.5">Q{i+1}</span>
                        <p className="text-sm font-medium text-gray-900">{q.question}</p>
                      </div>
                      <textarea value={recallAnswers[i]} onChange={e => setRecallAnswers(prev => { const a = [...prev]; a[i] = e.target.value; return a })}
                        placeholder="Your answer…" rows={2}
                        className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-blue-400 resize-none mb-1 transition" />
                      <button onClick={() => setShowHint(showHint === i ? null : i)} className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
                        <ChevronDown size={11} className={cn('transition-transform', showHint === i && 'rotate-180')} />
                        {showHint === i ? 'Hide hint' : 'Show hint'}
                      </button>
                      {showHint === i && <p className="text-xs text-blue-600 bg-blue-50 rounded px-3 py-1.5 mt-1">{q.hint}</p>}
                    </div>
                  ))}

                  {recallMode === 'answering' && (
                    <button onClick={submitRecall} disabled={recallAnswers.some(a => !a.trim())}
                      className="mt-3 flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      <CheckCircle size={13} />Submit answers
                    </button>
                  )}

                  {recallMode === 'result' && (
                    <div className="space-y-3">
                      <div className={cn('flex items-center gap-4 rounded-xl px-4 py-3', recallPassed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200')}>
                        <div className={cn('text-3xl font-bold', recallPassed ? 'text-green-700' : 'text-red-600')}>{recallScore}</div>
                        <div>
                          <p className={cn('text-sm font-semibold', recallPassed ? 'text-green-800' : 'text-red-700')}>{recallPassed ? '✓ Passed — marked as studied!' : '✗ Below 70% — review and retry'}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{recallPassed ? 'Spaced repetition review scheduled automatically.' : 'Re-read the lesson then take the quiz again.'}</p>
                        </div>
                      </div>
                      {recallResults.map((r, i) => (
                        <div key={i} className={cn('text-xs rounded-lg px-3 py-2', r.correct ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700')}>
                          <strong>Q{i+1}:</strong> {r.feedback}
                        </div>
                      ))}
                      {!recallPassed && (
                        <button onClick={startRecall} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><RefreshCw size={11} />Try again</button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Main footer bar */}
              <div className="px-8 py-4 flex items-center gap-3">
                <button onClick={() => { if (activeSubIdx > 0) selectSub(activeSubIdx - 1) }}
                  disabled={activeSubIdx === 0}
                  className="text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  ← Previous
                </button>

                {!isSubDone ? (
                  recallMode === 'idle' ? (
                    <button onClick={startRecall} disabled={!activeSub?.content || loadingLesson}
                      className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      <Brain size={14} />Test my knowledge
                    </button>
                  ) : recallPassed ? (
                    <div className="flex items-center gap-2 text-sm text-green-600 font-medium bg-green-50 border border-green-200 px-4 py-2 rounded-lg">
                      <CheckCircle size={14} /> Quiz passed!
                    </div>
                  ) : null
                ) : (
                  <div className="flex items-center gap-2 text-sm text-green-600 font-medium bg-green-50 border border-green-200 px-4 py-2 rounded-lg">
                    <CheckCircle size={14} /> Studied
                  </div>
                )}

                {!feynmanMode && activeSub?.content && !isSubDone && (
                  <button onClick={() => { setFeynmanMode(true); setFeynmanResult(null); setFeynmanText('') }}
                    className="flex items-center gap-1.5 text-sm text-purple-600 border border-purple-200 px-4 py-2 rounded-lg hover:bg-purple-50 transition-colors font-medium">
                    <Mic size={13} />Feynman mode
                  </button>
                )}

                <button onClick={() => { if (activeSubIdx < totalSubs - 1) selectSub(activeSubIdx + 1) }}
                  disabled={activeSubIdx >= totalSubs - 1}
                  className="text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  Next →
                </button>

                <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
                  <Flame size={13} className="text-orange-400" />
                  <span>{completedSubs.length} of {totalSubs} studied</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <ChatPanel open={chatOpen} stageId={activeStage?.id} onClose={() => setChatOpen(false)} sessionId={`roadmap-${roadmap.id}`} />
    </div>
  )
}
