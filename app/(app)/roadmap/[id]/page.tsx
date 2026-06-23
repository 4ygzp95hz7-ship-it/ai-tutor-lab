'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, Circle, Lock, Clock, ChevronDown, ChevronRight, BookOpen, MessageSquare, ExternalLink, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { cn, parseJSON } from '@/lib/utils'
import { ChatPanel } from '@/components/chat/ChatPanel'
import toast from 'react-hot-toast'

interface SubModule { title: string; description: string; objectives: string[]; estimatedHours: number; resources: { title: string; url: string; type: string }[] }
interface Stage { id: string; title: string; description: string; objectives: string[]; subModules: SubModule[]; resources: { title: string; url: string; type: string }[]; estimatedHours: number; status: string; orderIndex: number; exercises: { id: string; title: string; difficulty: string }[] }
interface Roadmap { id: string; title: string; description: string; topic: string; progressPct: number; confidenceScore: number; status: string; stages: Stage[] }

export default function RoadmapDetailPage() {
  const params = useParams()
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedStage, setExpandedStage] = useState<string | null>(null)
  const [expandedSub, setExpandedSub] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [activeStageId, setActiveStageId] = useState<string | undefined>()
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/roadmaps/${params.id}`)
      .then(r => r.json())
      .then(({ roadmap }) => {
        setRoadmap(roadmap)
        const inProgress = roadmap?.stages?.find((s: Stage) => s.status === 'in_progress')
        if (inProgress) setExpandedStage(inProgress.id)
      })
      .catch(() => toast.error('Failed to load roadmap'))
      .finally(() => setLoading(false))
  }, [params.id])

  async function markComplete(stageId: string) {
    setUpdating(stageId)
    try {
      const res = await fetch(`/api/stages/${stageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })
      const { stage, progressPct } = await res.json()
      setRoadmap(prev => prev ? { ...prev, progressPct, stages: prev.stages.map(s => s.id === stageId ? { ...s, status: stage.status } : s) } : prev)
      toast.success('Module completed! 🎉')
    } catch { toast.error('Failed to update') }
    finally { setUpdating(null) }
  }

  if (loading) return <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
  if (!roadmap) return <div className="p-6 text-center text-gray-500">Roadmap not found. <Link href="/roadmap" className="text-blue-600 underline">Go back</Link></div>

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-start gap-3 mb-6">
        <Link href="/roadmap" className="mt-1 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><ArrowLeft size={18} className="text-gray-500" /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-gray-900">{roadmap.title}</h1>
            <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-medium">{roadmap.status}</span>
          </div>
          <p className="text-sm text-gray-500">{roadmap.description}</p>
        </div>
        <button onClick={() => { setActiveStageId(undefined); setChatOpen(true) }} className="flex items-center gap-1.5 text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
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
        <p className="text-xs text-gray-400 mt-2">{roadmap.stages.filter(s => s.status === 'completed').length} of {roadmap.stages.length} modules completed</p>
      </div>

      {/* Stages */}
      <div className="space-y-2">
        {roadmap.stages.map((stage, index) => {
          const isExpanded = expandedStage === stage.id
          const isLocked = stage.status === 'not_started' && index > 0 && roadmap.stages[index - 1]?.status !== 'completed'
          return (
            <div key={stage.id} className={cn('bg-white border rounded-xl overflow-hidden transition-all', stage.status === 'completed' && 'border-green-200 bg-green-50/30', stage.status === 'in_progress' && 'border-blue-200', isLocked && 'opacity-60 border-gray-100')}>
              <button className="w-full px-4 py-3.5 flex items-center gap-3 text-left" onClick={() => !isLocked && setExpandedStage(isExpanded ? null : stage.id)} disabled={isLocked}>
                <div className="flex-shrink-0">
                  {stage.status === 'completed' ? <CheckCircle size={20} className="text-green-500" />
                    : stage.status === 'in_progress' ? <div className="w-5 h-5 border-2 border-blue-500 rounded-full flex items-center justify-center"><div className="w-2.5 h-2.5 bg-blue-500 rounded-full" /></div>
                    : isLocked ? <Lock size={18} className="text-gray-300" />
                    : <Circle size={20} className="text-gray-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Module {index + 1}</span>
                    {stage.status === 'in_progress' && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">In Progress</span>}
                  </div>
                  <p className="font-semibold text-gray-900 text-sm mt-0.5 truncate">{stage.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{stage.subModules?.length ?? 0} sub-modules</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={12} />{stage.estimatedHours}h</span>
                  {!isLocked && (isExpanded ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronRight size={15} className="text-gray-400" />)}
                </div>
              </button>

              {isExpanded && !isLocked && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <p className="text-sm text-gray-600 mt-3 mb-3">{stage.description}</p>

                  {stage.objectives.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Learning objectives</p>
                      <ul className="space-y-1">
                        {stage.objectives.map((obj, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <CheckCircle size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />{obj}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {stage.subModules?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sub-modules ({stage.subModules.length})</p>
                      <div className="space-y-1.5">
                        {stage.subModules.map((sub, si) => {
                          const key = `${stage.id}-${si}`
                          const open = expandedSub === key
                          return (
                            <div key={si} className="border border-gray-100 rounded-lg overflow-hidden">
                              <button className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-gray-50 transition-colors" onClick={() => setExpandedSub(open ? null : key)}>
                                <BookOpen size={13} className="text-blue-400 flex-shrink-0" />
                                <span className="flex-1 text-sm text-gray-700 font-medium">{sub.title}</span>
                                <span className="text-xs text-gray-400 flex items-center gap-0.5"><Clock size={10} />{sub.estimatedHours}h</span>
                                {open ? <ChevronDown size={13} className="text-gray-400" /> : <ChevronRight size={13} className="text-gray-400" />}
                              </button>
                              {open && (
                                <div className="px-3 pb-3 border-t border-gray-100 bg-white">
                                  <p className="text-xs text-gray-500 mt-2 mb-2">{sub.description}</p>
                                  {sub.objectives.length > 0 && <ul className="space-y-1 mb-2">{sub.objectives.map((o, oi) => <li key={oi} className="flex items-start gap-1.5 text-xs text-gray-600"><span className="text-blue-400 mt-0.5">✓</span>{o}</li>)}</ul>}
                                  {sub.resources.length > 0 && <div className="space-y-1">{sub.resources.map((r, ri) => <a key={ri} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"><ExternalLink size={10} />{r.title}<span className="text-gray-400">({r.type})</span></a>)}</div>}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {stage.resources.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Resources</p>
                      <div className="space-y-1">
                        {stage.resources.map((r, i) => <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline"><ExternalLink size={12} />{r.title}</a>)}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mt-4">
                    <button onClick={() => { setActiveStageId(stage.id); setChatOpen(true) }} className="flex items-center gap-1.5 text-sm border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                      <MessageSquare size={13} /> Ask AI about this module
                    </button>
                    {stage.status !== 'completed' && (
                      <button onClick={() => markComplete(stage.id)} disabled={updating === stage.id} className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors ml-auto">
                        <CheckCircle size={13} />
                        {updating === stage.id ? 'Saving…' : 'Mark complete'}
                      </button>
                    )}
                  </div>
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
