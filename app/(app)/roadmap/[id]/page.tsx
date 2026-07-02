'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useRoadmap } from '@/components/roadmap/RoadmapContext'
import type { Stage } from '@/components/roadmap/RoadmapContext'

export default function RoadmapRootPage() {
  const { roadmap, loadSubModules } = useRoadmap()
  const router = useRouter()

  useEffect(() => {
    if (!roadmap) return
    let cancelled = false
    ;(async () => {
      const stage = roadmap.stages.find((s: Stage) => s.status === 'in_progress') ?? roadmap.stages[0]
      if (!stage) return
      const loaded = stage.subModules?.length > 0 ? stage : await loadSubModules(stage)
      if (cancelled) return
      if (loaded.subModules?.length > 0) {
        const firstUndone = loaded.subModules.findIndex((_sm, i) => !(loaded.completedSubModules ?? []).includes(i))
        const idx = firstUndone === -1 ? 0 : firstUndone
        router.replace(`/roadmap/${roadmap.id}/module/${stage.id}/sub/${idx}`)
      } else {
        router.replace(`/roadmap/${roadmap.id}/module/${stage.id}`)
      }
    })()
    return () => { cancelled = true }
  }, [roadmap, router, loadSubModules])

  return (
    <div className="flex-1 flex items-center justify-center text-gray-400">
      <Loader2 size={24} className="animate-spin text-blue-500" />
    </div>
  )
}
