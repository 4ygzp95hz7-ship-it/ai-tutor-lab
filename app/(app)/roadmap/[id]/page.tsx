'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, Circle, Lock, Clock, ChevronDown, ChevronRight, BookOpen, MessageSquare, ExternalLink, ArrowLeft, Loader2, FileText } from 'lucide-react'
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
  content?: string
  estimatedHours: number
  status: string
  orderIndex: number
  exercises: { id: string; title: string; difficulty: string }[]
}

interface Roadmap {
  id: string
  title: string
  description: string
  topic: string
  progressPct: number
  confidenceScore: number
  status: string
  stages: Stage[]
}

export default function RoadmapDetailPage() {
  const params = useParams()
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedStage, setExpandedStage] = useState<string | null>(null)
  const [expandedSub, setExpandedSub] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [activeStageId, setActiveStageId] = useState<string | undefined>()
  const [loadingSubModules, setLoadingSubModules] = useState<string | null>(null)
  const [loadingLesson, setLoadingLesson] = useState<string | null>(null)
  const [completing, setCompleting] = useState<string | null>(null)

  const fetchRoadmap = useCallback(() => {
    fetch(`/api/roadmaps/${params.id}`)
      .then(r => r.json())
      .then(({ roadmap }) => {
        setRoadmap(prev => {
          // Preserve locally loaded lesson content across fetches
          if (!prev) return roadmap
          return {
            ...roadmap,
            stages: roadmap.stages.map((s: Stage) => {
              const prevStage = prev.stages.find(p => p.id === s.id)
              if (!prevStage) return s
              return {
                ...s,
                subModules: s.subModules.map((sub: SubModule, i: number) => ({
                  ...sub,
                  content: sub.content || prevStage.subModules[i]?.content,
                })),
              }
            }),
          }
        })
        const inProgress = roadmap?.stages?.find((s: Stage) => s.status === 'in_progress')
        if (inProgress) {
          setExpandedStage(inProgress.id)
          fetchSubModulesIfNeeded(inProgress.id, inProgress)
        }
      })
      .catch(() => toast.error('Failed to load roadmap'))
      .finally(() => setLoading(false))
  }, [params.id])

  useEffect(() => { fetchRoadmap() }, [fetchRoadmap])

  function fetchSubModulesIfNeeded(stageId: string, stage: Stage) {
    if (stage.subModules?.length > 0) return
    setLoadingSubModules(stageId)
    fetch(`/api/stages/${stageId}/submodules`, { method: 'POST' })
      .then(r => r.json())
      .then(({ subModules }) => {
        if (subModules) setRoadmap(prev => prev ? {
          ...prev, stages: prev.stages.map(s => s.id === stageId ? { ...s, subModules } : s),
        } : prev)
      })
      .catch(() => {})
      .finally(() => setLoadingSubModules(null))
  }

  function expandStage(stageId: string) {
    if (expandedStage === stageId) { setExpandedStage(null); return }
    setExpandedStage(stageId)
    const stage = roadmap?.stages.find(s => s.id === stageId)
    if (stage) fetchSubModulesIfNeeded(stageId, stage)
  }

  async function loadLesson(stageId: string, subIndex: number) {
    const key = `${stageId}-${subIndex}`
    const stage = roadmap?.stages.find(s => s.id === stageId)
    if (stage?.subModules[subIndex]?.content) return // already loaded

    setLoadingLesson(key)
    try {
      const res = await fetch(`/api/stages/${stageId}/submodule-lesson`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index: subIndex }),
      })
      const { content } = await res.json()
      if (content) {
        setRoadmap(prev => prev ? {
          ...prev, stages: prev.stages.map(s => s.id === stageId ? {
            ...s, subModules: s.subModules.map((sub, i) => i === subIndex ? { ...sub, content } : sub),
          } : s),
        } : prev)
      }
    } catch { toast.error('Failed to load lesson') }
    finally { setLoadingLesson(null) }
  }

  function expandSubModule(stageId: string, subIndex: number) {
    const key = `${stageId}-${subIndex}`
    if (expandedSub === key) { setExpandedSub(null); return }
    setExpandedSub(key)
    loadLesson(stageId, subIndex)
  }

  async function markSubModuleComplete(stageId: string, subIndex: number) {
    const key = `${stageId}-${subIndex}`
    setCompleting(key)
    try {
      const res = await fetch(`/api/stages/${stageId}/submodule-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index: subIndex }),
      })
      const { completedSubModules, stageCompleted, progressPct } = await res.json()

      setRoadmap(prev => {
        if (!prev) return prev
        const stage = prev.stages.find(s => s.id === stageId)
        const totalSubs = stage?.subModules.length ?? 0
        const allDone = completedSubModules.length >= totalSubs

        return {
          ...prev,
          progressPct: progressPct ?? prev.progressPct,
          stages: prev.stages.map(s => s.id === stageId ? {
            ...s,
            completedSubModules,
            status: stageCompleted ? 'completed' : s.status,
          } : s),
        }
      })

      if (stageCompleted) toast.success('Module complete! 🎉')
      else toast.success('Sub-module marked as studied ✓')
    } catch { toast.error('Failed to save progress') }
    finally { setCompleting(null) }
  }

  if (loading) return <div className="p-6 space-y-3 max-w-3xl mx-auto">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
  if (!roadmap) return <div className="p-6 text-center text-gray-500">Roadmap not found. <Link href="/roadmap" className="text-blue-600 underline">Go back</Link></div>

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <Link href="/roadmap" className="mt-1 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><ArrowLeft size={18} className="text-gray-500" /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-gray-900">{roadmap.title}</h1>
            <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-medium">{roadmap.status}</span>
          </div>
          <p className="text-sm text-gray-500">{roadmap.description}</p>
        </div>
        <button onClick={() => { setActiveStageId(undefined); setChatOpen(true) }} className="flex items-center gap-1.5 text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0">
          <MessageSquare size={14} /> Ask AI
        </button>
      </div>

      {/* Progress */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium text-gray-700">Overall progress</span>
          <span className="font-bold text-blue-600">{roadmap.progressPct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${roadmap.progressPct}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {roadmap.stages.filter(s => s.status === 'completed').length} of {roadmap.stages.length} modules completed
        </p>
      </div>

      {/* Stages */}
      <div className="space-y-2">
        {roadmap.stages.map((stage, index) => {
          const isExpanded = expandedStage === stage.id
          const isLocked = stage.status === 'not_started' && index > 0 && roadmap.stages[index - 1]?.status !== 'completed'
          const completedSubs = stage.completedSubModules ?? []
          const totalSubs = stage.subModules?.length ?? 0
          const subProgress = totalSubs > 0 ? Math.round((completedSubs.length / totalSubs) * 100) : 0

          return (
            <div key={stage.id} className={cn('bg-white border rounded-xl overflow-hidden transition-all',
              stage.status === 'completed' && 'border-green-200 bg-green-50/30',
              stage.status === 'in_progress' && 'border-blue-200',
              isLocked && 'opacity-60 border-gray-100'
            )}>
              {/* Stage header */}
              <button className="w-full px-4 py-3.5 flex items-center gap-3 text-left" onClick={() => !isLocked && expandStage(stage.id)} disabled={isLocked}>
                <div className="flex-shrink-0">
                  {stage.status === 'completed' ? <CheckCircle size={20} className="text-green-500" />
                    : stage.status === 'in_progress' ? <div className="w-5 h-5 border-2 border-blue-500 rounded-full flex items-center justify-center"><div className="w-2.5 h-2.5 bg-blue-500 rounded-full" /></div>
                    : isLocked ? <Lock size={18} className="text-gray-300" />
                    : <Circle size={20} className="text-gray-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Module {index + 1}</span>
                    {stage.status === 'in_progress' && totalSubs > 0 && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {completedSubs.length}/{totalSubs} studied
                      </span>
                    )}
                    {stage.status === 'completed' && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Complete</span>}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm mt-0.5 truncate">{stage.title}</p>
                  {totalSubs > 0 && stage.status !== 'completed' && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden max-w-32">
                        <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${subProgress}%` }} />
                      </div>
                      <span className="text-xs text-gray-400">{subProgress}%</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={12} />{stage.estimatedHours}h</span>
                  {!isLocked && (isExpanded ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronRight size={15} className="text-gray-400" />)}
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && !isLocked && (
                <div className="border-t border-gray-100">
                  {/* Stage description + Ask AI */}
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-start justify-between gap-3">
                    <p className="text-sm text-gray-600 leading-relaxed">{stage.description}</p>
                    <button onClick={() => { setActiveStageId(stage.id); setChatOpen(true) }} className="flex-shrink-0 flex items-center gap-1 text-xs text-blue-600 border border-blue-200 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                      <MessageSquare size={12} /> Ask AI
                    </button>
                  </div>

                  {/* Sub-modules loading */}
                  {loadingSubModules === stage.id && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 px-4 py-4">
                      <Loader2 size={14} className="animate-spin" />Generating sub-modules…
                    </div>
                  )}

                  {/* Sub-modules list */}
                  {stage.subModules?.length > 0 && (
                    <div className="divide-y divide-gray-100">
                      {stage.subModules.map((sub, si) => {
                        const subKey = `${stage.id}-${si}`
                        const isSubExpanded = expandedSub === subKey
                        const isSubDone = completedSubs.includes(si)
                        const isLoadingThis = loadingLesson === subKey
                        const isCompletingThis = completing === subKey

                        return (
                          <div key={si}>
                            {/* Sub-module header */}
                            <button
                              className={cn('w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors',
                                isSubDone && 'bg-green-50/50')}
                              onClick={() => expandSubModule(stage.id, si)}
                            >
                              <div className="flex-shrink-0">
                                {isSubDone
                                  ? <CheckCircle size={16} className="text-green-500" />
                                  : <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <BookOpen size={12} className="text-blue-400 flex-shrink-0" />
                                  <span className={cn('text-sm font-medium truncate', isSubDone ? 'text-gray-400 line-through' : 'text-gray-800')}>
                                    {sub.title}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5 ml-4 truncate">{sub.description}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs text-gray-400 flex items-center gap-0.5"><Clock size={10} />{sub.estimatedHours}h</span>
                                {isSubExpanded ? <ChevronDown size={13} className="text-gray-400" /> : <ChevronRight size={13} className="text-gray-400" />}
                              </div>
                            </button>

                            {/* Sub-module expanded content */}
                            {isSubExpanded && (
                              <div className="bg-white border-t border-gray-50 px-4 pb-4 ml-7">
                                {/* Objectives */}
                                {sub.objectives?.length > 0 && (
                                  <div className="py-3 border-b border-gray-50">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Objectives</p>
                                    <ul className="space-y-1">
                                      {sub.objectives.map((obj, oi) => (
                                        <li key={oi} className="flex items-start gap-2 text-xs text-gray-600">
                                          <span className="text-blue-400 mt-0.5 flex-shrink-0">✓</span>{obj}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Lesson content */}
                                <div className="py-3 border-b border-gray-50">
                                  <div className="flex items-center gap-2 mb-3">
                                    <FileText size={13} className="text-blue-500" />
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lesson</p>
                                  </div>
                                  {isLoadingThis ? (
                                    <div className="flex items-center gap-2 text-sm text-blue-600 py-2">
                                      <Loader2 size={13} className="animate-spin" />Generating lesson with AI…
                                    </div>
                                  ) : sub.content ? (
                                    <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded prose-code:text-blue-700 prose-code:text-xs prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:text-xs prose-a:text-blue-600 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-li:my-0.5">
                                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{sub.content}</ReactMarkdown>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-gray-400 py-1">Lesson loading…</p>
                                  )}
                                </div>

                                {/* Resources */}
                                {sub.resources?.length > 0 && (
                                  <div className="py-3 border-b border-gray-50">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Resources</p>
                                    <div className="space-y-1">
                                      {sub.resources.map((r, ri) => (
                                        <a key={ri} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                                          <ExternalLink size={10} />{r.title}<span className="text-gray-400">({r.type})</span>
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Mark as studied */}
                                {!isSubDone && (
                                  <div className="pt-3">
                                    <button
                                      onClick={() => markSubModuleComplete(stage.id, si)}
                                      disabled={isCompletingThis}
                                      className="flex items-center gap-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
                                    >
                                      {isCompletingThis ? <><Loader2 size={13} className="animate-spin" />Saving…</> : <><CheckCircle size={13} />Mark as studied</>}
                                    </button>
                                    {completedSubs.length === stage.subModules.length - 1 && (
                                      <p className="text-xs text-green-600 mt-2 font-medium">✓ Last one — completing this will finish the module!</p>
                                    )}
                                  </div>
                                )}
                                {isSubDone && (
                                  <div className="pt-3 flex items-center gap-1.5 text-xs text-green-600 font-medium">
                                    <CheckCircle size={13} /> Studied
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Stage-level resources */}
                  {stage.resources?.length > 0 && (
                    <div className="px-4 py-3 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Module Resources</p>
                      <div className="space-y-1">
                        {stage.resources.map((r, i) => (
                          <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                            <ExternalLink size={12} />{r.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <ChatPanel open={chatOpen} stageId={activeStageId} onClose={() => setChatOpen(false)} sessionId={`roadmap-${roadmap.id}`} />
    </div>
  )
}
