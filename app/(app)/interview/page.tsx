'use client'

import { useState } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { parseJSON } from '@/lib/utils'

const TOPICS = ['Machine Learning', 'React', 'System Design', 'Python', 'TypeScript', 'Node.js', 'AWS', 'Data Structures']

interface Question { id: string; question: string; type: string; difficulty: string }
interface AnswerResult { questionId: string; score: number; feedback: string; keyPoints: string[] }

export default function InterviewPrepPage() {
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [results, setResults] = useState<Record<string, AnswerResult>>({})
  const [currentQ, setCurrentQ] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function startSession() {
    if (!topic.trim()) { toast.error('Enter a topic'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/interview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic, difficulty }) })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
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
      const res = await fetch(`/api/interview/${sessionId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId: q.id, question: q.question, answer }) })
      const data = await res.json()
      setResults(prev => ({ ...prev, [q.id]: data.result }))
      if (currentQ < questions.length - 1) setTimeout(() => setCurrentQ(c => c + 1), 1000)
    } catch { toast.error('Failed to evaluate answer') }
    finally { setSubmitting(false) }
  }

  if (!sessionId) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Interview prep</h1>
        <p className="text-gray-500 mb-6">Practice with AI-graded questions tailored to your topic.</p>
        <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Topic</label>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Machine Learning, React…" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 transition" />
            <div className="flex flex-wrap gap-2 mt-2">{TOPICS.map(t => <button key={t} onClick={() => setTopic(t)} className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-3 py-1 rounded-full hover:border-blue-300 hover:text-blue-700 transition-colors">{t}</button>)}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
            <div className="flex gap-3">{['easy', 'medium', 'hard'].map(d => <button key={d} onClick={() => setDifficulty(d)} className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${difficulty === d ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>{d.charAt(0).toUpperCase() + d.slice(1)}</button>)}</div>
          </div>
          <button onClick={startSession} disabled={loading || !topic.trim()} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Generating questions…</> : 'Start interview session'}
          </button>
        </div>
      </div>
    )
  }

  const q = questions[currentQ]
  const result = results[q?.id]
  const totalAnswered = Object.keys(results).length
  const avgScore = totalAnswered > 0 ? Math.round(Object.values(results).reduce((a, r) => a + r.score, 0) / totalAnswered) : 0

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Interview: {topic}</h1>
          <p className="text-sm text-gray-500">{difficulty} difficulty · {totalAnswered}/{questions.length} answered {totalAnswered > 0 && `· Avg: ${avgScore}/100`}</p>
        </div>
        <div className="flex gap-1">{questions.map((_, i) => <div key={i} className={`w-2 h-2 rounded-full ${i < totalAnswered ? 'bg-green-500' : i === currentQ ? 'bg-blue-500' : 'bg-gray-200'}`} />)}</div>
      </div>

      {q && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{q.type}</span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{q.difficulty}</span>
            <span className="text-xs text-gray-400 ml-auto">Question {currentQ + 1} of {questions.length}</span>
          </div>
          <p className="text-base font-medium text-gray-900 mb-4">{q.question}</p>
          {!result ? (
            <>
              <textarea value={answers[q.id] ?? ''} onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))} rows={5} placeholder="Type your answer here…" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 resize-none mb-3 transition" />
              <button onClick={submitAnswer} disabled={submitting || !answers[q.id]?.trim()} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Evaluating…</> : 'Submit answer'}
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <div className={`border rounded-xl p-4 ${result.score >= 70 ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm ${result.score >= 70 ? 'border-green-500 text-green-700' : 'border-amber-500 text-amber-700'}`}>{result.score}</div>
                  <p className="text-sm text-gray-700">{result.feedback}</p>
                </div>
                {result.keyPoints.length > 0 && <div className="flex flex-wrap gap-2 mt-2">{result.keyPoints.map((kp, i) => <span key={i} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-full">{kp}</span>)}</div>}
              </div>
              {currentQ < questions.length - 1 ? (
                <button onClick={() => setCurrentQ(c => c + 1)} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Next question →</button>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
                  <p className="font-semibold text-gray-900">Session complete!</p>
                  <p className="text-sm text-gray-500">Final score: {avgScore}/100</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
