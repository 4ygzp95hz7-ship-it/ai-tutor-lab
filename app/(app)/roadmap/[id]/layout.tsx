'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { RoadmapProvider, useRoadmap } from '@/components/roadmap/RoadmapContext'
import { Sidebar } from '@/components/roadmap/Sidebar'
import { ChatPanel } from '@/components/chat/ChatPanel'

function RoadmapShell({ children }: { children: React.ReactNode }) {
  const { roadmap, loading, chatOpen, setChatOpen, chatStageId } = useRoadmap()
  const router = useRouter()

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

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden bg-white min-w-0">
        {/* Mobile: module selector dropdown */}
        <div className="md:hidden flex-shrink-0 bg-white border-b border-gray-100 px-4 py-2">
          <select
            defaultValue=""
            onChange={e => { if (e.target.value) router.push(`/roadmap/${roadmap.id}/module/${e.target.value}`) }}
            className="w-full text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none"
          >
            <option value="" disabled>Jump to module…</option>
            {roadmap.stages.map((s, i) => (
              <option key={s.id} value={s.id}>
                {s.status === 'completed' ? '✓ ' : s.status === 'in_progress' ? '▶ ' : `${i + 1}. `}{s.title}
              </option>
            ))}
          </select>
        </div>

        {children}
      </div>

      <ChatPanel open={chatOpen} stageId={chatStageId} onClose={() => setChatOpen(false)} sessionId={`roadmap-${roadmap.id}`} />
    </div>
  )
}

export default function RoadmapLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <RoadmapProvider roadmapId={id}>
      <RoadmapShell>{children}</RoadmapShell>
    </RoadmapProvider>
  )
}
