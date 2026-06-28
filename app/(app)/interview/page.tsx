'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Loader2, Map, Plus, ChevronDown, Sparkles } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Roadmap { id: string; topic: string; title: string; progressPct: number; status: string }
interface Question { id: string; question: string; type: string; difficulty: string }
interface AnswerResult { questionId: string; score: number; feedback: string; keyPoints: string[] }

const SUGGESTED_TOPICS = ['System Design', 'Data Structures & Algorithms', 'SQL & Databases', 'Operating Systems', 'Networking Basics']

export default function InterviewPrepPage() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([])
  const [loadingRoadmaps, setLoadingRoadmaps] = useState(true)
  const [topicSource, setTopicSource] = useState<'roadmap' | 'custom'>('roadmap')
  const [selectedRoadmapId, setSelectedRoadmapId] = useState('')
  const [customTopic, setCustomTopic] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [count, setCount] = useState(10)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [results, setResults] = useState<Record<string, AnswerResult>>({})
  const [currentQ, setCurrentQ] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/roadmaps')
      .then(r => r.json())
      .then(({ roadmaps: rms }) => {
        const sorted = (rms ?? []).sort((a: Roadmap, b: Roadmap) => b.progressPct - a.progressPct)
        setRoadmaps(sorted)
        if (sorted.length > 0) {
          setSelectedRoadmapId(sorted[0].id)
          setTopicSource('roadmap')
        } else {
          setTopicSource('custom')
        }
      })
      .finally(() => setLoadingRoadmaps(false))
  }, [])

  const activeTopic = topicSource === 'roadmap'
    ? roadmaps.find(r => r.id === selectedRoadmapId)?.topic ?? ''
    : customTopic.trim()

  async function startSession() {
    if (!activeTopic) { toast.error('Select or enter a topic first'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/interview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: activeTopic, difficulty, count }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed'); return }
      setSessionId(data.session.id)
      setQuestions(data.questions)
      setCurrentQ(0)
    } catch { toast.error('Failed to generate questions') }
    finally { setLoading(false) }
  }

  async function submitAnswer() {
    const q = questions[currentQ]
    const answer = answers[q.id]
    if (!answer?.trim()) { toast.error('Write your answer first'); return }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/interview/${sessionId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: q.id, question: q.question, answer }),
      })
      const data = await res.json()
      setResults(prev => ({ ...prev, [q.id]: data.result }))
      if (currentQ < questions.length - 1) setTimeout(() => setCurrentQ(c => c + 1), 800)
    } catch { toast.error('Failed to evaluate') }
    finally { setSubmitting(false) }
  }

  const selectedRoadmap = roadmaps.find(r => r.id === selectedRoadmapId)

  // ── SETUP SCREEN ─────────────────────────────────────────────────────────────
  if (!sessionId) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Interview prep</h1>
          <p className="text-gray-500 text-sm">AI-graded questions tailored to what you've been learning.</p>
        </div>

        {loadingRoadmaps ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-8 justify-center">
            <Loader2 size={16} className="animate-spin" /> Loading your roadmaps…
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">

            {/* Topic source toggle */}
            <div className="border-b border-gray-100 p-5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">What topic to prepare for?</label>
              <div className="flex rounded-xl overflow-hidden border border-gray-200">
                <button
                  onClick={() => setTopicSource('roadmap')}
                  disabled={roadmaps.length === 0}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${topicSource === 'roadmap' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'} ${roadmaps.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}>
                  <Map size={15} />
                  From my roadmaps
                </button>
                <button
                  onClick={() => setTopicSource('custom')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${topicSource === 'custom' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  <Sparkles size={15} />
                  Custom topic
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Topic selection */}
              {topicSource === 'roadmap' ? (
                <div>
                  {roadmaps.length === 0 ? (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 text-center">
                      <Map size={28} className="text-blue-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-blue-800 mb-1">No roadmaps yet</p>
                      <p className="text-xs text-blue-600 mb-4">Create a learning roadmap first — interview prep will be tailored to exactly what you've studied.</p>
                      <Link href="/roadmap/new" className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        <Plus size={14} /> Create a roadmap
                      </Link>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Select roadmap</label>
                      <div className="relative">
                        <select
                          value={selectedRoadmapId}
                          onChange={e => setSelectedRoadmapId(e.target.value)}
                          className="w-full appearance-none border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-800 bg-white outline-none focus:border-blue-400 transition pr-10 cursor-pointer"
                        >
                          {roadmaps.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.topic} — {r.progressPct}% complete
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>

                      {/* Selected roadmap context */}
                      {selectedRoadmap && (
                        <div className="mt-3 bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-center gap-3">
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-700">{selectedRoadmap.title}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${selectedRoadmap.progressPct}%` }} />
                              </div>
                              <span className="text-xs font-medium text-blue-600">{selectedRoadmap.progressPct}%</span>
                            </div>
                          </div>
                          <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${selectedRoadmap.status === 'active' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                            {selectedRoadmap.status}
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-gray-400 mt-2">Questions will be calibrated to the topic and depth you've covered.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Enter topic</label>
                  <input
                    value={customTopic}
                    onChange={e => setCustomTopic(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && startSession()}
                    placeholder="e.g. System Design, Python, Kubernetes…"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 transition"
                    autoFocus
                  />
                  {/* Suggested topics */}
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    {SUGGESTED_TOPICS.map(t => (
                      <button key={t} onClick={() => setCustomTopic(t)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${customTopic === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                  {roadmaps.length > 0 && (
                    <p className="text-xs text-gray-400 mt-2.5">
                      Or <button onClick={() => setTopicSource('roadmap')} className="text-blue-600 hover:underline">use a topic from your roadmaps</button> for more targeted questions.
                    </p>
                  )}
                </div>
              )}

              {/* Difficulty + count */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Difficulty</label>
                <div className="flex gap-2">
                  {['easy', 'medium', 'hard'].map(d => (
                    <button key={d} onClick={() => setDifficulty(d)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all capitalize ${difficulty === d ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Number of questions: <span className="text-blue-600 font-bold">{count}</span>
                </label>
                <input type="range" min={5} max={20} step={5} value={count} onChange={e => setCount(Number(e.target.value))}
                  className="w-full" />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>5 (quick)</span><span>10 (standard)</span><span>15</span><span>20 (thorough)</span>
                </div>
              </div>

              {/* Start button */}
              <button onClick={startSession} disabled={loading || !activeTopic}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm">
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> Generating {count} questions…</>
                  : <>Start interview session — {activeTopic || 'select a topic'}</>}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── ACTIVE SESSION ────────────────────────────────────────────────────────────
  const q = questions[currentQ]
  const result = results[q?.id]
  const totalAnswered = Object.keys(results).length
  const avgScore = totalAnswered > 0 ? Math.round(Object.values(results).reduce((a, r) => a + r.score, 0) / totalAnswered) : 0

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Interview: {activeTopic}</h1>
          <p className="text-sm text-gray-500">{difficulty} · {totalAnswered}/{questions.length} answered{totalAnswered > 0 ? ` · Avg: ${avgScore}/100` : ''}</p>
        </div>
        <div className="flex gap-1 flex-wrap max-w-32 justify-end">
          {questions.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${i < totalAnswered ? 'bg-green-500' : i === currentQ ? 'bg-blue-500' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>

      {q && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 md:p-6 mb-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${q.type === 'conceptual' ? 'bg-blue-50 text-blue-700' : q.type === 'coding' ? 'bg-green-50 text-green-700' : q.type === 'system-design' ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
              {q.type}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${q.difficulty === 'easy' ? 'bg-green-50 text-green-700' : q.difficulty === 'hard' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
              {q.difficulty}
            </span>
            <span className="text-xs text-gray-400 ml-auto">Q{currentQ + 1} / {questions.length}</span>
          </div>
          <p className="text-base font-semibold text-gray-900 mb-4 leading-relaxed">{q.question}</p>

          {!result ? (
            <>
              <textarea
                value={answers[q.id] ?? ''}
                onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                rows={5}
                placeholder="Type your answer here…"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 resize-none mb-3 transition"
              />
              <button onClick={submitAnswer} disabled={submitting || !answers[q.id]?.trim()}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Evaluating…</> : 'Submit answer'}
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <div className={`flex items-center gap-4 rounded-xl p-4 ${result.score >= 70 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-lg flex-shrink-0 ${result.score >= 70 ? 'border-green-500 text-green-700' : 'border-amber-500 text-amber-700'}`}>
                  {result.score}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{result.feedback}</p>
              </div>
              {result.keyPoints?.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Key points</p>
                  <div className="flex flex-wrap gap-2">
                    {result.keyPoints.map((kp, i) => (
                      <span key={i} className="text-xs bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full">{kp}</span>
                    ))}
                  </div>
                </div>
              )}
              {currentQ < questions.length - 1 ? (
                <button onClick={() => setCurrentQ(c => c + 1)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                  Next question →
                </button>
              ) : (
                <div className="text-center py-4 bg-green-50 border border-green-200 rounded-xl">
                  <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
                  <p className="font-semibold text-gray-900">Session complete!</p>
                  <p className="text-sm text-gray-500 mb-4">Final score: {avgScore}/100</p>
                  <button onClick={() => { setSessionId(null); setQuestions([]); setAnswers({}); setResults({}); setCurrentQ(0) }}
                    className="text-sm text-blue-600 hover:underline font-medium">
                    Start another session →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
