'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

const LEVELS = [
  { value: 'beginner', label: 'Beginner', desc: "I'm new to this topic" },
  { value: 'intermediate', label: 'Intermediate', desc: 'I know the basics' },
  { value: 'advanced', label: 'Advanced', desc: 'I want to go deep' },
]

const POPULAR = ['Machine Learning', 'React', 'System Design', 'Python', 'TypeScript', 'Kubernetes', 'AWS', 'Data Structures']

export default function NewRoadmapPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [topic, setTopic] = useState(searchParams.get('topic') ?? '')
  const [level, setLevel] = useState('beginner')
  const [loading, setLoading] = useState(false)

  async function generate() {
    if (!topic.trim()) { toast.error('Enter a topic first'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/roadmaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), level }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed to generate roadmap'); return }
      toast.success('Roadmap created!')
      router.push(`/roadmap/${data.roadmap.id}`)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Create a learning roadmap</h1>
        <p className="text-gray-500">Enter any topic and we&apos;ll build a complete, personalized curriculum for you.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-6">
        {/* Topic input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">What do you want to learn?</label>
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generate()}
            placeholder="e.g. Machine Learning, React, System Design…"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition"
            autoFocus
          />
          <div className="flex flex-wrap gap-2 mt-3">
            {POPULAR.map(p => (
              <button
                key={p}
                onClick={() => setTopic(p)}
                className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-3 py-1 rounded-full hover:border-blue-300 hover:text-blue-700 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Experience level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Your experience level</label>
          <div className="grid grid-cols-3 gap-3">
            {LEVELS.map(l => (
              <button
                key={l.value}
                onClick={() => setLevel(l.value)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  level === l.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`font-medium text-sm ${level === l.value ? 'text-blue-700' : 'text-gray-800'}`}>{l.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{l.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading || !topic.trim()}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Building your complete curriculum…
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Generate my roadmap
            </>
          )}
        </button>

        {loading && (
          <p className="text-xs text-center text-gray-400">
            This takes 5–15 seconds. We&apos;re building every module and sub-module your topic requires — no shortcuts.
          </p>
        )}
      </div>
    </div>
  )
}
