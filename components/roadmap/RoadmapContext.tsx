'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export interface SubModule {
  title: string
  description: string
  objectives: string[]
  estimatedHours: number
  resources: { title: string; url: string; type: string }[]
  content?: string
  videoStatus?: string
  videoUrl?: string
}

export interface Stage {
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
  content?: string
  cheatSheet?: string
  videoStatus?: string
  videoUrl?: string
}

export interface Roadmap {
  id: string
  title: string
  topic: string
  progressPct: number
  stages: Stage[]
}

interface RoadmapContextValue {
  roadmap: Roadmap | null
  loading: boolean
  refetch: () => Promise<void>
  updateStage: (stageId: string, patch: Partial<Stage>) => void
  updateSubModule: (stageId: string, idx: number, patch: Partial<SubModule>) => void
  setProgressPct: (pct: number) => void
  loadSubModules: (stage: Stage) => Promise<Stage>
  generateModuleVideo: (stageId: string) => Promise<void>
  generateSubModuleVideo: (stageId: string, subIdx: number) => Promise<void>
  chatOpen: boolean
  setChatOpen: (open: boolean) => void
  chatStageId?: string
  setChatStageId: (id?: string) => void
}

const RoadmapCtx = createContext<RoadmapContextValue | null>(null)

export function RoadmapProvider({ roadmapId, children }: { roadmapId: string; children: React.ReactNode }) {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [loading, setLoading] = useState(true)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatStageId, setChatStageId] = useState<string | undefined>(undefined)

  const refetch = useCallback(async () => {
    const res = await fetch(`/api/roadmaps/${roadmapId}`)
    const { roadmap: rm } = await res.json()
    setRoadmap(rm)
  }, [roadmapId])

  useEffect(() => {
    fetch(`/api/roadmaps/${roadmapId}`)
      .then(r => r.json())
      .then(({ roadmap: rm }) => setRoadmap(rm))
      .catch(() => toast.error('Failed to load roadmap'))
      .finally(() => setLoading(false))
  }, [roadmapId])

  const updateStage = useCallback((stageId: string, patch: Partial<Stage>) => {
    setRoadmap(prev => prev ? { ...prev, stages: prev.stages.map(s => s.id === stageId ? { ...s, ...patch } : s) } : prev)
  }, [])

  const updateSubModule = useCallback((stageId: string, idx: number, patch: Partial<SubModule>) => {
    setRoadmap(prev => prev ? {
      ...prev, stages: prev.stages.map(s => s.id === stageId ? {
        ...s, subModules: s.subModules.map((sm, i) => i === idx ? { ...sm, ...patch } : sm)
      } : s)
    } : prev)
  }, [])

  const setProgressPct = useCallback((pct: number) => {
    setRoadmap(prev => prev ? { ...prev, progressPct: pct } : prev)
  }, [])

  const loadSubModules = useCallback(async (stage: Stage): Promise<Stage> => {
    if (stage.subModules?.length > 0) return stage
    try {
      const res = await fetch(`/api/stages/${stage.id}/submodules`, { method: 'POST' })
      const { subModules } = await res.json()
      const updated = { ...stage, subModules: subModules ?? [] }
      updateStage(stage.id, { subModules: updated.subModules })
      return updated
    } catch {
      return stage
    }
  }, [updateStage])

  const generateModuleVideo = useCallback(async (stageId: string) => {
    const poll = async (): Promise<{ status: string; videoUrl?: string }> => {
      const res = await fetch(`/api/stages/${stageId}/video`, { method: 'POST' })
      return res.json()
    }
    try {
      let result = await poll()
      updateStage(stageId, { videoStatus: result.status, videoUrl: result.videoUrl })
      while (result.status === 'pending' || result.status === 'processing') {
        await new Promise(r => setTimeout(r, 5000))
        result = await poll()
        updateStage(stageId, { videoStatus: result.status, videoUrl: result.videoUrl })
      }
    } catch { toast.error('Video generation failed') }
  }, [updateStage])

  const generateSubModuleVideo = useCallback(async (stageId: string, subIdx: number) => {
    const poll = async (): Promise<{ status: string; videoUrl?: string }> => {
      const res = await fetch(`/api/stages/${stageId}/submodule-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index: subIdx }),
      })
      return res.json()
    }
    try {
      let result = await poll()
      updateSubModule(stageId, subIdx, { videoStatus: result.status, videoUrl: result.videoUrl })
      while (result.status === 'pending' || result.status === 'processing') {
        await new Promise(r => setTimeout(r, 5000))
        result = await poll()
        updateSubModule(stageId, subIdx, { videoStatus: result.status, videoUrl: result.videoUrl })
      }
    } catch { toast.error('Video generation failed') }
  }, [updateSubModule])

  return (
    <RoadmapCtx.Provider value={{
      roadmap, loading, refetch, updateStage, updateSubModule, setProgressPct, loadSubModules,
      generateModuleVideo, generateSubModuleVideo,
      chatOpen, setChatOpen, chatStageId, setChatStageId,
    }}>
      {children}
    </RoadmapCtx.Provider>
  )
}

export function useRoadmap() {
  const ctx = useContext(RoadmapCtx)
  if (!ctx) throw new Error('useRoadmap must be used within RoadmapProvider')
  return ctx
}
