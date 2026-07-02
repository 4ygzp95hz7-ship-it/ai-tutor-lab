'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, ChevronRight, Clock, FileText, MessageSquare, CheckCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRoadmap } from '@/components/roadmap/RoadmapContext'
import { CopyLinkButton } from '@/components/roadmap/CopyLinkButton'
import { VideoTextPane } from '@/components/lesson/VideoTextPane'
import { LessonEnhancedContent } from '@/components/lesson/LessonEnhancedContent'

interface Connections {
  prev: { id: string; title: string; status: string } | null
  next: { id: string; title: string; status: string } | null
  conceptual: { id: string; title: string; status: string }[]
}

export default function ModuleOverviewPage() {
  const params = useParams<{ id: string; stageId: string }>()
  const { roadmap, loadSubModules, updateStage, generateModuleVideo, setChatOpen, setChatStageId } = useRoadmap()
  const [connections, setConnections] = useState<Connections | null>(null)

  const stage = roadmap?.stages.find(s => s.id === params.stageId)

  useEffect(() => {
    if (!stage) return
    if (stage.subModules?.length === 0) loadSubModules(stage)
  }, [stage, loadSubModules])

  useEffect(() => {
    if (!stage) return
    if (stage.content && stage.content.length > 50) return
    fetch(`/api/stages/${stage.id}/content`, { method: 'POST' })
      .then(r => r.json())
      .then(({ content }) => { if (content) updateStage(stage.id, { content }) })
      .catch(() => {})
  }, [stage, updateStage])

  useEffect(() => {
    if (!params.stageId) return
    fetch(`/api/stages/${params.stageId}/connections`)
      .then(r => r.json())
      .then(setConnections)
      .catch(() => {})
  }, [params.stageId])

  if (!roadmap || !stage) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center"><BookOpen size={32} className="mx-auto mb-3 text-gray-200" /><p className="text-sm">Module not found</p></div>
      </div>
    )
  }

  const completedSubs = stage.completedSubModules ?? []
  const totalSubs = stage.subModules?.length ?? 0

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-100 px-4 md:px-8 py-4 md:py-5 flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
              <BookOpen size={11} />
              <span>{roadmap.title}</span>
              <ChevronRight size={11} />
              <span className="text-gray-600 font-medium">{stage.title}</span>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-3 leading-tight">{stage.title}</h1>
            <p className="text-sm text-gray-500">{stage.description}</p>
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full">
              <Clock size={11} />{stage.estimatedHours}h
            </div>
            <div className="flex items-center gap-2">
              <CopyLinkButton />
              <Link href={`/cheatsheet/${stage.id}`} target="_blank"
                className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full hover:bg-amber-100 transition-colors">
                <FileText size={11} /> Cheat sheet
              </Link>
              <button onClick={() => { setChatStageId(stage.id); setChatOpen(true) }}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
                <MessageSquare size={11} /> Ask AI
              </button>
            </div>
          </div>
        </div>
      </div>

      <VideoTextPane
        videoLabel="Module video overview"
        videoStatus={stage.videoStatus}
        videoUrl={stage.videoUrl}
        onGenerateVideo={() => generateModuleVideo(stage.id)}
        generateLabel="Generate module video"
      >
        {stage.objectives?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6 pb-6 border-b border-gray-100">
            {stage.objectives.map((obj, i) => (
              <span key={i} className="text-xs bg-gray-50 border border-gray-100 text-gray-600 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <span className="text-blue-500">✓</span>{obj}
              </span>
            ))}
          </div>
        )}

        {stage.content ? (
          <LessonEnhancedContent content={stage.content} resources={stage.resources} topic={roadmap.topic} />
        ) : (
          <div className="flex flex-col items-center gap-4 py-16 text-gray-400">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-blue-600 font-medium">Generating module overview…</p>
          </div>
        )}

        {/* Concept connections */}
        {connections && (connections.prev || connections.next || connections.conceptual.length > 0) && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Concept connections</p>
            <div className="flex flex-wrap gap-2">
              {connections.prev && (
                <div className="flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
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
                <div className="flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <span className="text-gray-600 font-medium">Leads to:</span>
                  <span className={cn('font-medium', connections.next.status === 'completed' ? 'text-green-600' : 'text-gray-700')}>{connections.next.title}</span>
                  <span className="text-gray-400">→</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sub-modules in this module */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Sub-modules {totalSubs > 0 && `(${completedSubs.length}/${totalSubs})`}
          </p>
          {totalSubs === 0 ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-3">
              <Loader2 size={14} className="animate-spin" /> Generating sub-modules…
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stage.subModules.map((sub, si) => {
                const done = completedSubs.includes(si)
                return (
                  <Link key={si} href={`/roadmap/${roadmap.id}/module/${stage.id}/sub/${si}`}
                    className="flex items-start gap-3 bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors">
                    <div className={cn('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                      done ? 'bg-green-100' : 'bg-gray-100')}>
                      {done ? <CheckCircle size={13} className="text-green-600" /> : <span className="text-xs font-bold text-gray-400">{si + 1}</span>}
                    </div>
                    <div className="min-w-0">
                      <p className={cn('text-sm font-medium leading-snug', done ? 'text-gray-500' : 'text-gray-900')}>{sub.title}</p>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{sub.description}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </VideoTextPane>
    </div>
  )
}
