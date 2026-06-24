'use client'

import { useState, useEffect } from 'react'
import { Code, Loader2, CheckCircle, XCircle, ChevronDown, Lightbulb, RefreshCw, Send } from 'lucide-react'
import { parseJSON } from '@/lib/utils'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface Stage { id: string; title: string; status: string; orderIndex: number }
interface Roadmap { id: string; topic: string; title: string; stages: Stage[] }
interface Exercise { id: string; title: string; problem: string; starterCode: string; language: string; hints: string; difficulty: string }
interface Submission { score: number; feedback: string; result: string }

export default function PracticePage() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([])
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null)
  const [selectedRoadmap, setSelectedRoadmap] = useState<Roadmap | null>(null)
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [code, setCode] = useState('')
  const [loadingExercise, setLoadingExercise] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<Submission | null>(null)
  const [hintsShown, setHintsShown] = useState(0)
  const [expandedRoadmap, setExpandedRoadmap] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/roadmaps')
      .then(r => r.json())
      .then(({ roadmaps }) => {
        setRoadmaps(roadmaps ?? [])
        // Auto-expand first active roadmap
        const first = roadmaps?.find((r: Roadmap) => r.stages?.some((s: Stage) => s.status === 'in_progress'))
        if (first) setExpandedRoadmap(first.id)
      })
      .catch(() => toast.error('Failed to load roadmaps'))
  }, [])

  async function loadExercise(stage: Stage, roadmap: Roadmap) {
    setSelectedStage(stage)
    setSelectedRoadmap(roadmap)
    setExercise(null)
    setCode('')
    setResult(null)
    setHintsShown(0)
    setLoadingExercise(true)

    try {
      const res = await fetch(`/api/stages/${stage.id}/exercise`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error('Failed to load exercise'); return }
      setExercise(data.exercise)
      setCode(data.exercise.starterCode || '')

      // Also check previous submissions
      const subRes = await fetch(`/api/exercises/${data.exercise.id}/submit`)
      const subData = await subRes.json()
      if (subData.submissions?.length > 0) {
        setResult(subData.submissions[0])
      }
    } catch { toast.error('Failed to load exercise') }
    finally { setLoadingExercise(false) }
  }

  async function submitCode() {
    if (!exercise || !code.trim()) return
    setSubmitting(true)
    setResult(null)
    try {
      const res = await fetch(`/api/exercises/${exercise.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error('Submission failed'); return }
      setResult({ score: data.score, feedback: data.feedback, result: data.submission.result })
    } catch { toast.error('Submission failed') }
    finally { setSubmitting(false) }
  }

  const hints = exercise ? parseJSON<string[]>(exercise.hints, []) : []

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel — stage picker */}
      <div className="w-64 min-w-64 bg-white border-r border-gray-100 overflow-y-auto">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Pick a module to practice</h2>
          <p className="text-xs text-gray-400 mt-0.5">AI generates a coding exercise for each module</p>
        </div>

        {roadmaps.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-xs text-gray-400 mb-3">No roadmaps yet</p>
            <Link href="/roadmap/new" className="text-xs text-blue-600 hover:underline">Create your first roadmap →</Link>
          </div>
        ) : (
          roadmaps.map(roadmap => (
            <div key={roadmap.id}>
              <button
                onClick={() => setExpandedRoadmap(expandedRoadmap === roadmap.id ? null : roadmap.id)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-700 truncate">{roadmap.topic}</p>
                  <p className="text-xs text-gray-400">{roadmap.stages?.length ?? 0} modules</p>
                </div>
                <ChevronDown size={13} className={cn('text-gray-400 transition-transform flex-shrink-0', expandedRoadmap === roadmap.id && 'rotate-180')} />
              </button>

              {expandedRoadmap === roadmap.id && (
                <div className="border-t border-gray-50">
                  {roadmap.stages?.map(stage => (
                    <button
                      key={stage.id}
                      onClick={() => loadExercise(stage, roadmap)}
                      className={cn(
                        'w-full px-4 py-2.5 text-left text-xs transition-colors border-l-2',
                        selectedStage?.id === stage.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                          : 'border-transparent text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'w-1.5 h-1.5 rounded-full flex-shrink-0',
                          stage.status === 'completed' ? 'bg-green-500' :
                          stage.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-300'
                        )} />
                        <span className="truncate">{stage.title}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Right panel — exercise */}
      <div className="flex-1 overflow-y-auto">
        {!selectedStage ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <Code size={24} className="text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Select a module to practice</h3>
            <p className="text-sm text-gray-400 max-w-xs">Claude will generate a coding exercise tailored to the module you're learning.</p>
          </div>
        ) : loadingExercise ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 size={24} className="text-blue-600 animate-spin" />
            <p className="text-sm text-blue-600 font-medium">Generating your exercise…</p>
            <p className="text-xs text-gray-400">Creating a challenge for <strong>{selectedStage.title}</strong></p>
          </div>
        ) : exercise ? (
          <div className="max-w-3xl mx-auto p-6">
            {/* Exercise header */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-400">{selectedRoadmap?.topic}</span>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-400">{selectedStage.title}</span>
                <span className={cn('ml-auto text-xs font-medium px-2 py-0.5 rounded-full',
                  exercise.difficulty === 'easy' ? 'bg-green-50 text-green-700' :
                  exercise.difficulty === 'hard' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                )}>
                  {exercise.difficulty}
                </span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{exercise.language}</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">{exercise.title}</h1>
            </div>

            {/* Problem statement */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Problem</h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{exercise.problem}</p>
            </div>

            {/* Hints */}
            {hints.length > 0 && (
              <div className="mb-4">
                {hints.slice(0, hintsShown).map((hint, i) => (
                  <div key={i} className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 mb-2 text-sm text-amber-800">
                    <Lightbulb size={14} className="flex-shrink-0 mt-0.5 text-amber-500" />
                    <span><strong>Hint {i + 1}:</strong> {hint}</span>
                  </div>
                ))}
                {hintsShown < hints.length && (
                  <button onClick={() => setHintsShown(h => h + 1)} className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-800 transition-colors">
                    <Lightbulb size={12} /> Reveal hint {hintsShown + 1} of {hints.length}
                  </button>
                )}
              </div>
            )}

            {/* Code editor */}
            <div className="bg-gray-900 rounded-xl overflow-hidden mb-4">
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500 opacity-70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-70" />
                  <div className="w-3 h-3 rounded-full bg-green-500 opacity-70" />
                </div>
                <span className="text-xs text-gray-400">{exercise.language}</span>
                <button onClick={() => setCode(exercise.starterCode)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors">
                  <RefreshCw size={11} /> Reset
                </button>
              </div>
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full bg-gray-900 text-green-300 font-mono text-sm p-4 outline-none resize-none leading-relaxed"
                rows={Math.max(12, code.split('\n').length + 2)}
                placeholder="Write your solution here…"
                spellCheck={false}
              />
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={submitCode}
                disabled={submitting || !code.trim()}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Evaluating…</> : <><Send size={14} /> Submit solution</>}
              </button>
              <p className="text-xs text-gray-400">AI evaluates code quality and correctness</p>
            </div>

            {/* Result */}
            {result && (
              <div className={cn('border rounded-xl p-5', result.result === 'pass' ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50')}>
                <div className="flex items-center gap-3 mb-3">
                  {result.result === 'pass'
                    ? <CheckCircle size={20} className="text-green-600" />
                    : <XCircle size={20} className="text-amber-600" />}
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-2xl">{result.score}</span>
                    <span className="text-gray-400 text-sm">/100</span>
                    <span className={cn('ml-1 text-sm font-medium', result.result === 'pass' ? 'text-green-700' : 'text-amber-700')}>
                      {result.result === 'pass' ? '— Nice work!' : '— Keep going!'}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{result.feedback}</p>
                {result.result === 'pass' && (
                  <Link href={`/roadmap/${selectedRoadmap?.id}`} className="inline-flex items-center gap-1.5 mt-3 text-sm text-blue-600 hover:underline font-medium">
                    Continue to next module →
                  </Link>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
