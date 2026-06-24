'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Sparkles, Loader2, ChevronRight, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const LEVELS = [
  { value: 'beginner', label: "I'm new to this", desc: 'Start from the fundamentals' },
  { value: 'intermediate', label: 'I know the basics', desc: 'Skip the intro, go deeper' },
  { value: 'advanced', label: 'I want to go deep', desc: 'Jump straight to advanced topics' },
]

const POPULAR = ['Machine Learning', 'React', 'System Design', 'Python', 'TypeScript', 'Data Structures', 'AWS', 'Kubernetes']

type Step = 1 | 2 | 3 | 4 | 5

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState('beginner')
  const [generating, setGenerating] = useState(false)
  const [generatedModules, setGeneratedModules] = useState<string[]>([])
  const [roadmapId, setRoadmapId] = useState('')

  async function handleTopicSubmit() {
    if (!topic.trim()) { toast.error('Enter a topic first'); return }
    setStep(2)
    await fetch('/api/onboarding', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 2 }) })
  }

  async function handleLevelSubmit() {
    setStep(3)
    await fetch('/api/onboarding', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 3 }) })
    // Start generating immediately
    generateRoadmap()
  }

  async function generateRoadmap() {
    setGenerating(true)
    setGeneratedModules([])

    // Animate module names appearing while generating
    const mockModules = [
      'Fundamentals', 'Core Concepts', 'Practical Application',
      'Advanced Topics', 'Best Practices', 'Real-world Projects',
    ]
    let i = 0
    const interval = setInterval(() => {
      if (i < mockModules.length) {
        setGeneratedModules(prev => [...prev, `${topic}: ${mockModules[i]}`])
        i++
      }
    }, 1800)

    try {
      const res = await fetch('/api/roadmaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), level }),
      })
      clearInterval(interval)
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed to generate'); setGenerating(false); return }
      setRoadmapId(data.roadmap.id)
      setGeneratedModules(data.roadmap.stages.map((s: { title: string }) => s.title))
      setGenerating(false)
      setStep(4)
      await fetch('/api/onboarding', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 4 }) })
      // Auto-advance to reveal after brief pause
      setTimeout(() => setStep(5), 1200)
    } catch {
      clearInterval(interval)
      setGenerating(false)
      toast.error('Something went wrong. Please try again.')
    }
  }

  async function startLearning() {
    await fetch('/api/onboarding', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ step: 5 }) })
    router.push(roadmapId ? `/roadmap/${roadmapId}` : '/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 p-5">
        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
          <BookOpen size={14} className="text-white" />
        </div>
        <span className="font-semibold text-gray-900 text-sm">AI Tutor Lab</span>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mt-4 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${step >= s ? 'w-8 bg-blue-600' : 'w-4 bg-gray-200'}`} />
        ))}
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">

          {/* Step 1 — Topic */}
          {step === 1 && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-2xl mb-5">
                <Sparkles size={24} className="text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">What do you want to learn?</h1>
              <p className="text-gray-500 mb-8">Type any topic — we'll build your complete personal curriculum from scratch.</p>

              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTopicSubmit()}
                placeholder="e.g. Machine Learning, React, System Design…"
                className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition mb-4"
                autoFocus
              />

              <div className="flex flex-wrap gap-2 mb-6 justify-center">
                {POPULAR.map(p => (
                  <button key={p} onClick={() => setTopic(p)} className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full hover:border-blue-300 hover:text-blue-700 transition-colors">
                    {p}
                  </button>
                ))}
              </div>

              <button
                onClick={handleTopicSubmit}
                disabled={!topic.trim()}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Continue <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Step 2 — Experience level */}
          {step === 2 && (
            <div>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">What's your experience level?</h1>
                <p className="text-gray-500">We'll tailor the depth of your <span className="font-medium text-gray-700">{topic}</span> curriculum to match where you are.</p>
              </div>

              <div className="space-y-3 mb-8">
                {LEVELS.map(l => (
                  <button
                    key={l.value}
                    onClick={() => setLevel(l.value)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${level === l.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                  >
                    <div className={`font-semibold text-sm ${level === l.value ? 'text-blue-700' : 'text-gray-800'}`}>{l.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{l.desc}</div>
                  </button>
                ))}
              </div>

              <button
                onClick={handleLevelSubmit}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Build my roadmap <Sparkles size={16} />
              </button>
            </div>
          )}

          {/* Step 3 — Generating */}
          {(step === 3 || (step === 4 && generating)) && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-2xl mb-5">
                <Loader2 size={24} className="text-blue-600 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Building your curriculum…</h1>
              <p className="text-gray-500 mb-8">Designing every module and sub-module your <span className="font-medium text-gray-700">{topic}</span> mastery requires. No shortcuts.</p>

              <div className="space-y-2 text-left">
                {generatedModules.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white border border-gray-100 rounded-lg px-4 py-2.5 text-sm text-gray-700">
                    <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                    {m}
                  </div>
                ))}
                {generatedModules.length === 0 && (
                  <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-lg px-4 py-2.5 text-sm text-gray-400">
                    <Loader2 size={14} className="animate-spin flex-shrink-0" />
                    Designing your roadmap…
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5 — Reveal */}
          {step === 5 && (
            <div className="text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Your roadmap is ready!</h1>
              <p className="text-gray-500 mb-6">
                <span className="font-semibold text-gray-800">{generatedModules.length} modules</span> built for you — from fundamentals to mastery. Every module has a full lesson, sub-modules, exercises, and an AI tutor ready to answer your doubts.
              </p>

              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-6 text-left max-h-48 overflow-y-auto">
                {generatedModules.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 text-sm text-gray-700">
                    <span className="text-xs text-gray-400 w-5 text-right">{i + 1}</span>
                    <span>{m}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={startLearning}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors text-base"
              >
                Start Learning <ChevronRight size={18} />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
