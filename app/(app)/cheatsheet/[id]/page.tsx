'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Printer, Loader2, BookOpen, RefreshCw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function CheatSheetPage() {
  const params = useParams()
  const [cheatSheet, setCheatSheet] = useState('')
  const [stageTitle, setStageTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [roadmapId, setRoadmapId] = useState('')
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)

  async function generate(force = false) {
    setLoading(true)
    try {
      // Get stage info first
      if (!stageTitle) {
        // Fetch from roadmap to get stage details
        const roadmapsRes = await fetch('/api/roadmaps')
        const { roadmaps } = await roadmapsRes.json()
        for (const rm of roadmaps ?? []) {
          const detail = await fetch(`/api/roadmaps/${rm.id}`)
          const { roadmap } = await detail.json()
          const stage = roadmap?.stages?.find((s: { id: string }) => s.id === params.id)
          if (stage) {
            setStageTitle(stage.title)
            setTopic(roadmap.topic)
            setRoadmapId(rm.id)
            break
          }
        }
      }

      const res = await fetch(`/api/stages/${params.id}/cheatsheet`, { method: 'POST' })
      const data = await res.json()
      if (data.cheatSheet) setCheatSheet(data.cheatSheet)
    } catch { }
    finally { setLoading(false); setRegenerating(false) }
  }

  useEffect(() => { generate() }, [params.id])

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <Loader2 size={28} className="text-blue-500 animate-spin mx-auto mb-3" />
        <p className="text-sm text-blue-600 font-medium">Generating your cheat sheet…</p>
        <p className="text-xs text-gray-400 mt-1">Claude is distilling the key concepts</p>
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header — hidden in print */}
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <Link href={roadmapId ? `/roadmap/${roadmapId}` : '/roadmap'} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-gray-500" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">{stageTitle} — Cheat Sheet</h1>
          <p className="text-sm text-gray-400">{topic} · Quick reference card</p>
        </div>
        <button onClick={() => { setRegenerating(true); generate(true) }} disabled={regenerating}
          className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
          <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} /> Regenerate
        </button>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Printer size={15} /> Print / Save PDF
        </button>
      </div>

      {/* Cheat sheet content */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm print:shadow-none print:border-none print:p-0 print:rounded-none">
        {/* Print header */}
        <div className="hidden print:flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <BookOpen size={20} className="text-blue-600" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">{stageTitle} — Cheat Sheet</h1>
            <p className="text-sm text-gray-500">AI Tutor Lab · {topic}</p>
          </div>
        </div>

        <div className="prose prose-sm max-w-none
          prose-headings:font-semibold prose-headings:text-gray-900
          prose-h1:text-xl prose-h2:text-base prose-h3:text-sm
          prose-p:text-gray-700 prose-p:leading-relaxed prose-p:text-sm
          prose-li:text-sm prose-li:text-gray-700 prose-li:my-0.5
          prose-strong:text-gray-900
          prose-code:bg-gray-100 prose-code:text-blue-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:text-xs prose-pre:rounded-lg prose-pre:leading-relaxed
          prose-table:text-sm
          prose-th:bg-blue-50 prose-th:text-blue-800 prose-th:font-semibold prose-th:py-2 prose-th:px-3
          prose-td:py-2 prose-td:px-3 prose-td:text-gray-700 prose-td:border prose-td:border-gray-200
          prose-a:text-blue-600">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{cheatSheet}</ReactMarkdown>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { font-size: 12px; }
          .print\\:hidden { display: none !important; }
          .print\\:flex { display: flex !important; }
          .print\\:block { display: block !important; }
          @page { margin: 1.5cm; size: A4; }
          pre { white-space: pre-wrap !important; }
        }
      `}</style>
    </div>
  )
}
