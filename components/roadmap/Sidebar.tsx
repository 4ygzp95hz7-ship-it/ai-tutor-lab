'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRoadmap } from './RoadmapContext'

export function Sidebar() {
  const { roadmap } = useRoadmap()
  const params = useParams<{ id: string; stageId?: string; index?: string }>()

  if (!roadmap) return null

  return (
    <aside className="hidden md:flex w-56 min-w-56 bg-white border-r border-gray-100 flex-col overflow-hidden">
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

      <div className="flex-1 overflow-y-auto py-1">
        {roadmap.stages.map((stage, idx) => {
          const isActive = params.stageId === stage.id
          const isDone = stage.status === 'completed'
          const isLocked = stage.status === 'not_started' && idx > 0 && roadmap.stages[idx - 1]?.status !== 'completed'
          const stageCompleted = stage.completedSubModules ?? []
          const stageSubs = stage.subModules?.length ?? 0

          return (
            <div key={stage.id}>
              <Link
                href={isLocked ? '#' : `/roadmap/${roadmap.id}/module/${stage.id}`}
                aria-disabled={isLocked}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors',
                  isActive ? 'bg-blue-50' : 'hover:bg-gray-50',
                  isLocked && 'opacity-40 pointer-events-none'
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
              </Link>

              {isActive && stage.subModules?.length > 0 && (
                <div className="pl-8 pb-1">
                  {stage.subModules.map((sub, si) => {
                    const subDone = stageCompleted.includes(si)
                    const subActive = params.index === String(si)
                    return (
                      <Link key={si} href={`/roadmap/${roadmap.id}/module/${stage.id}/sub/${si}`}
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
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
