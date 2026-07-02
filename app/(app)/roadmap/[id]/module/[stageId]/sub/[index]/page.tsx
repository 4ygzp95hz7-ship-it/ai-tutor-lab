'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  BookOpen, ChevronRight, Clock, FileText, MessageSquare, CheckCircle, Loader2,
  ExternalLink, Brain, Mic, ChevronDown, XCircle, RefreshCw, HelpCircle, Flame,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRoadmap } from '@/components/roadmap/RoadmapContext'
import { CopyLinkButton } from '@/components/roadmap/CopyLinkButton'
import { VideoTextPane } from '@/components/lesson/VideoTextPane'
import { LessonEnhancedContent } from '@/components/lesson/LessonEnhancedContent'
import toast from 'react-hot-toast'

export default function SubModulePage() {
  const params = useParams<{ id: string; stageId: string; index: string }>()
  const router = useRouter()
  const { roadmap, updateStage, updateSubModule, setProgressPct, generateSubModuleVideo, setChatOpen, setChatStageId } = useRoadmap()

  const stage = roadmap?.stages.find(s => s.id === params.stageId)
  const subIdx = Number(params.index)
  const sub = stage?.subModules?.[subIdx]

  const [marking, setMarking] = useState(false)

  const [interviewQs, setInterviewQs] = useState<{ question: string; type: string; difficulty: string; keyPoints: string[] }[]>([])
  const [loadingInterviewQs, setLoadingInterviewQs] = useState(false)
  const [showInterviewQs, setShowInterviewQs] = useState(false)

  const [feynmanMode, setFeynmanMode] = useState(false)
  const [feynmanText, setFeynmanText] = useState('')
  const [feynmanLoading, setFeynmanLoading] = useState(false)
  const [feynmanResult, setFeynmanResult] = useState<{
    score: number; correct: string[]; gaps: string[]; misconceptions: string[]; nextStep: string; overallFeedback: string
  } | null>(null)

  const [recallMode, setRecallMode] = useState<'idle' | 'loading' | 'answering' | 'result'>('idle')
  const [recallQuestions, setRecallQuestions] = useState<{ question: string; type: string; hint: string; sampleAnswer: string }[]>([])
  const [recallAnswers, setRecallAnswers] = useState<string[]>(['', '', ''])
  const [recallResults, setRecallResults] = useState<{ score: number; correct: boolean; feedback: string }[]>([])
  const [recallScore, setRecallScore] = useState(0)
  const [recallPassed, setRecallPassed] = useState(false)
  const [showHint, setShowHint] = useState<number | null>(null)

  useEffect(() => {
    if (!stage || !sub) return
    if (sub.content && sub.content.length > 50) return
    fetch(`/api/stages/${stage.id}/submodule-lesson`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ index: subIdx }),
    })
      .then(r => r.json())
      .then(({ content }) => { if (content) updateSubModule(stage.id, subIdx, { content }) })
      .catch(() => {})
  }, [stage, sub, subIdx, updateSubModule])

  const loadInterviewQs = useCallback(async () => {
    if (!stage || loadingInterviewQs) return
    if (interviewQs.length > 0) { setShowInterviewQs(true); return }
    setLoadingInterviewQs(true)
    setShowInterviewQs(true)
    try {
      const res = await fetch(`/api/stages/${stage.id}/submodule-interview`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subModuleIndex: subIdx }),
      })
      const { questions } = await res.json()
      setInterviewQs(questions ?? [])
    } catch { toast.error('Failed to load questions') }
    finally { setLoadingInterviewQs(false) }
  }, [stage, subIdx, loadingInterviewQs, interviewQs.length])

  async function startRecall() {
    if (!stage) return
    setRecallMode('loading')
    setRecallAnswers(['', '', ''])
    setRecallResults([])
    setShowHint(null)
    try {
      const res = await fetch(`/api/stages/${stage.id}/recall`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subModuleIndex: subIdx }),
      })
      const { questions } = await res.json()
      setRecallQuestions(questions ?? [])
      setRecallMode('answering')
    } catch { toast.error('Failed to generate quiz'); setRecallMode('idle') }
  }

  async function submitRecall() {
    if (!stage) return
    setRecallMode('loading')
    try {
      const res = await fetch(`/api/stages/${stage.id}/recall`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subModuleIndex: subIdx, questions: recallQuestions, userAnswers: recallAnswers }),
      })
      const data = await res.json()
      setRecallResults(data.results ?? [])
      setRecallScore(data.score)
      setRecallPassed(data.passed)
      setRecallMode('result')
      if (data.passed) {
        toast.success(`Quiz passed! ${data.score}/100 — sub-module scheduled for review 🎉`)
        await markStudied()
      } else {
        toast.error(`Score: ${data.score}/100 — review the lesson and try again`)
      }
    } catch { toast.error('Failed to submit'); setRecallMode('idle') }
  }

  async function submitFeynman() {
    if (!stage || !feynmanText.trim()) return
    setFeynmanLoading(true)
    setFeynmanResult(null)
    try {
      const res = await fetch(`/api/stages/${stage.id}/feynman`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subModuleIndex: subIdx, explanation: feynmanText }),
      })
      setFeynmanResult(await res.json())
    } catch { toast.error('Failed to evaluate') }
    finally { setFeynmanLoading(false) }
  }

  async function markStudied() {
    if (!stage || !roadmap) return
    setMarking(true)
    try {
      const res = await fetch(`/api/stages/${stage.id}/submodule-complete`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ index: subIdx }),
      })
      const { completedSubModules, stageCompleted, progressPct } = await res.json()

      updateStage(stage.id, { completedSubModules, status: stageCompleted ? 'completed' : stage.status })
      if (progressPct !== undefined) setProgressPct(progressPct)

      if (stageCompleted) {
        toast.success('Module complete! 🎉')
        const nextStage = roadmap.stages.find(s => s.orderIndex === stage.orderIndex + 1)
        if (nextStage) setTimeout(() => router.push(`/roadmap/${roadmap.id}/module/${nextStage.id}`), 800)
      } else {
        toast.success('Marked as studied ✓')
        const nextIdx = subIdx + 1
        if (nextIdx < (stage.subModules?.length ?? 0)) {
          setTimeout(() => router.push(`/roadmap/${roadmap.id}/module/${stage.id}/sub/${nextIdx}`), 400)
        }
      }
    } catch { toast.error('Failed to save') }
    finally { setMarking(false) }
  }

  if (!roadmap || !stage || !sub) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center"><BookOpen size={32} className="mx-auto mb-3 text-gray-200" /><p className="text-sm">Sub-module not found</p></div>
      </div>
    )
  }

  const completedSubs = stage.completedSubModules ?? []
  const totalSubs = stage.subModules?.length ?? 0
  const subProgress = totalSubs > 0 ? (completedSubs.length / totalSubs) * 100 : 0
  const isSubDone = completedSubs.includes(subIdx)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="h-1 bg-gray-100 flex-shrink-0">
        <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${subProgress}%` }} />
      </div>

      {/* Header */}
      <div className="border-b border-gray-100 px-4 md:px-8 py-4 md:py-5 flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
              <BookOpen size={11} />
              <Link href={`/roadmap/${roadmap.id}/module/${stage.id}`} className="hover:text-gray-600 transition-colors">{stage.title}</Link>
              <ChevronRight size={11} />
              <span className="text-gray-600 font-medium">{sub.title}</span>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-3 leading-tight">{sub.title}</h1>
            {totalSubs > 0 && (
              <div className="flex flex-wrap gap-2">
                {stage.subModules.map((s, si) => {
                  const done = completedSubs.includes(si)
                  const active = si === subIdx
                  return (
                    <Link key={si} href={`/roadmap/${roadmap.id}/module/${stage.id}/sub/${si}`}
                      className={cn('flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all',
                        done ? 'bg-green-50 border-green-200 text-green-700' :
                        active ? 'bg-blue-600 border-blue-600 text-white' :
                        'bg-white border-gray-200 text-gray-600 hover:border-gray-300')}>
                      {done && <CheckCircle size={10} />}
                      {s.title}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full">
              <Clock size={11} />{sub.estimatedHours}h
            </div>
            <div className="flex items-center gap-2">
              <CopyLinkButton />
              <Link href={`/cheatsheet/${stage.id}`} target="_blank"
                className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full hover:bg-amber-100 transition-colors">
                <FileText size={11} /> Cheat sheet
              </Link>
              <button onClick={() => { setChatStageId(stage.id); setChatOpen(true) }}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
                <MessageSquare size={11} /> Ask AI
              </button>
            </div>
          </div>
        </div>
      </div>

      <VideoTextPane
        videoLabel="This sub-module's video"
        videoStatus={sub.videoStatus}
        videoUrl={sub.videoUrl}
        onGenerateVideo={() => generateSubModuleVideo(stage.id, subIdx)}
        generateLabel="Generate video summary"
      >
        {sub.objectives?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6 pb-6 border-b border-gray-100">
            {sub.objectives.map((obj, i) => (
              <span key={i} className="text-xs bg-gray-50 border border-gray-100 text-gray-600 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <span className="text-blue-500">✓</span>{obj}
              </span>
            ))}
          </div>
        )}

        {sub.content ? (
          <LessonEnhancedContent content={sub.content} resources={sub.resources} subModuleTitle={sub.title} topic={stage.title} />
        ) : (
          <div className="flex flex-col items-center gap-4 py-16 text-gray-400">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-sm text-blue-600 font-medium">Generating your lesson…</p>
              <p className="text-xs text-gray-400 mt-1">Claude is writing a focused lesson with diagrams and examples</p>
            </div>
          </div>
        )}

        {/* Interview questions section */}
        {sub.content && (
          <div className="mt-8 pt-6 border-t border-gray-100">
            <button onClick={loadInterviewQs}
              className="flex items-center gap-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-100 px-4 py-2 rounded-lg hover:bg-purple-100 transition-colors w-full justify-center">
              <HelpCircle size={15} />
              {showInterviewQs ? 'Hide interview questions' : 'What do interviewers ask about this?'}
            </button>

            {showInterviewQs && (
              <div className="mt-4">
                {loadingInterviewQs ? (
                  <div className="flex items-center gap-2 text-sm text-purple-600 py-3 justify-center">
                    <Loader2 size={14} className="animate-spin" />Generating interview questions…
                  </div>
                ) : interviewQs.length > 0 ? (
                  <div className="space-y-3">
                    {interviewQs.map((q, i) => (
                      <div key={i} className="border border-purple-100 rounded-xl p-4 bg-purple-50/30">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            q.difficulty === 'junior' ? 'bg-green-100 text-green-700' :
                            q.difficulty === 'mid' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'}`}>
                            {q.difficulty}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            q.type === 'conceptual' ? 'bg-blue-100 text-blue-700' :
                            q.type === 'practical' ? 'bg-green-100 text-green-700' :
                            'bg-orange-100 text-orange-700'}`}>
                            {q.type}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 mb-2">{q.question}</p>
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1.5">Key points a great answer covers:</p>
                          <ul className="space-y-1">
                            {q.keyPoints.map((kp, ki) => (
                              <li key={ki} className="text-xs text-gray-600 flex items-start gap-1.5">
                                <span className="text-purple-400 mt-0.5 flex-shrink-0">•</span>{kp}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Non-video resources */}
        {(sub.resources?.filter(r => r.type !== 'video').length ?? 0) > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-100">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Resources</h4>
            <div className="flex flex-wrap gap-2">
              {sub.resources.filter(r => r.type !== 'video').map((r, i) => (
                <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
                  <ExternalLink size={10} />{r.title}
                </a>
              ))}
            </div>
          </div>
        )}
      </VideoTextPane>

      {/* RETENTION ZONE */}
      <div className="border-t border-gray-100 flex-shrink-0 bg-white">
        {feynmanMode && (
          <div className="px-8 py-5 border-b border-gray-100 bg-purple-50/40">
            <div className="flex items-center gap-2 mb-3">
              <Mic size={15} className="text-purple-600" />
              <span className="text-sm font-semibold text-purple-800">Feynman Mode — explain it back</span>
              <button onClick={() => { setFeynmanMode(false); setFeynmanResult(null); setFeynmanText('') }} className="ml-auto text-gray-400 hover:text-gray-600"><XCircle size={15} /></button>
            </div>
            <p className="text-xs text-purple-700 mb-3">Explain <strong>{sub.title}</strong> in your own words, as if teaching a complete beginner. The more specific, the better the feedback.</p>
            {!feynmanResult ? (
              <>
                <textarea value={feynmanText} onChange={e => setFeynmanText(e.target.value)}
                  placeholder="Start explaining the concept…"
                  rows={4} className="w-full border border-purple-200 rounded-xl px-4 py-3 text-sm bg-white outline-none focus:border-purple-400 resize-none mb-3 transition" />
                <button onClick={submitFeynman} disabled={feynmanLoading || !feynmanText.trim()}
                  className="flex items-center gap-2 bg-purple-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors">
                  {feynmanLoading ? <><Loader2 size={13} className="animate-spin" />Evaluating…</> : <><Brain size={13} />Get feedback</>}
                </button>
              </>
            ) : (
              <div className="space-y-3">
                <div className={cn('flex items-center gap-3 rounded-xl px-4 py-3', feynmanResult.score >= 70 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200')}>
                  <div className={cn('text-2xl font-bold', feynmanResult.score >= 70 ? 'text-green-700' : 'text-amber-700')}>{feynmanResult.score}</div>
                  <div className="flex-1 text-sm text-gray-700 leading-relaxed">{feynmanResult.overallFeedback}</div>
                </div>
                {feynmanResult.correct.length > 0 && (
                  <div className="bg-green-50 rounded-lg px-4 py-2.5">
                    <p className="text-xs font-semibold text-green-700 mb-1">✓ Got right</p>
                    {feynmanResult.correct.map((c, i) => <p key={i} className="text-xs text-green-700">{c}</p>)}
                  </div>
                )}
                {feynmanResult.gaps.length > 0 && (
                  <div className="bg-amber-50 rounded-lg px-4 py-2.5">
                    <p className="text-xs font-semibold text-amber-700 mb-1">⚠ Missing or unclear</p>
                    {feynmanResult.gaps.map((g, i) => <p key={i} className="text-xs text-amber-700">{g}</p>)}
                  </div>
                )}
                {feynmanResult.misconceptions.length > 0 && (
                  <div className="bg-red-50 rounded-lg px-4 py-2.5">
                    <p className="text-xs font-semibold text-red-700 mb-1">✗ Needs correction</p>
                    {feynmanResult.misconceptions.map((m, i) => <p key={i} className="text-xs text-red-700">{m}</p>)}
                  </div>
                )}
                <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-4 py-2.5"><strong>Next:</strong> {feynmanResult.nextStep}</p>
                <button onClick={() => { setFeynmanResult(null); setFeynmanText('') }} className="text-xs text-purple-600 hover:underline flex items-center gap-1"><RefreshCw size={11} />Try again</button>
              </div>
            )}
          </div>
        )}

        {recallMode !== 'idle' && (
          <div className="px-8 py-5 border-b border-gray-100 bg-blue-50/40">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={15} className="text-blue-600" />
              <span className="text-sm font-semibold text-blue-800">Recall Quiz — test your understanding</span>
              {recallMode !== 'loading' && (
                <button onClick={() => setRecallMode('idle')} className="ml-auto text-gray-400 hover:text-gray-600"><XCircle size={15} /></button>
              )}
            </div>

            {recallMode === 'loading' && (
              <div className="flex items-center gap-2 text-sm text-blue-600 py-3">
                <Loader2 size={14} className="animate-spin" />
                {recallQuestions.length === 0 ? 'Generating questions…' : 'Evaluating your answers…'}
              </div>
            )}

            {recallMode === 'answering' && recallQuestions.map((q, i) => (
              <div key={i} className="mb-5 last:mb-0">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold flex-shrink-0 mt-0.5">Q{i + 1}</span>
                  <p className="text-sm font-medium text-gray-900">{q.question}</p>
                </div>
                <textarea value={recallAnswers[i]} onChange={e => setRecallAnswers(prev => { const a = [...prev]; a[i] = e.target.value; return a })}
                  placeholder="Your answer…" rows={2}
                  className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-blue-400 resize-none mb-1 transition" />
                <button onClick={() => setShowHint(showHint === i ? null : i)} className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
                  <ChevronDown size={11} className={cn('transition-transform', showHint === i && 'rotate-180')} />
                  {showHint === i ? 'Hide hint' : 'Show hint'}
                </button>
                {showHint === i && <p className="text-xs text-blue-600 bg-blue-50 rounded px-3 py-1.5 mt-1">{q.hint}</p>}
              </div>
            ))}

            {recallMode === 'answering' && (
              <button onClick={submitRecall} disabled={recallAnswers.some(a => !a.trim())}
                className="mt-3 flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                <CheckCircle size={13} />Submit answers
              </button>
            )}

            {recallMode === 'result' && (
              <div className="space-y-3">
                <div className={cn('flex items-center gap-4 rounded-xl px-4 py-3', recallPassed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200')}>
                  <div className={cn('text-3xl font-bold', recallPassed ? 'text-green-700' : 'text-red-600')}>{recallScore}</div>
                  <div>
                    <p className={cn('text-sm font-semibold', recallPassed ? 'text-green-800' : 'text-red-700')}>{recallPassed ? '✓ Passed — marked as studied!' : '✗ Below 70% — review and retry'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{recallPassed ? 'Spaced repetition review scheduled automatically.' : 'Re-read the lesson then take the quiz again.'}</p>
                  </div>
                </div>
                {recallResults.map((r, i) => (
                  <div key={i} className={cn('text-xs rounded-lg px-3 py-2', r.correct ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700')}>
                    <strong>Q{i + 1}:</strong> {r.feedback}
                  </div>
                ))}
                {!recallPassed && (
                  <button onClick={startRecall} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><RefreshCw size={11} />Try again</button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer bar */}
        <div className="px-4 md:px-8 py-3 md:py-4 flex items-center gap-2 md:gap-3">
          <button onClick={() => { if (subIdx > 0) router.push(`/roadmap/${roadmap.id}/module/${stage.id}/sub/${subIdx - 1}`) }}
            disabled={subIdx === 0}
            className="text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            ← Previous
          </button>

          {!isSubDone ? (
            recallMode === 'idle' ? (
              <button onClick={startRecall} disabled={!sub.content || marking}
                className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <Brain size={14} />Test my knowledge
              </button>
            ) : recallPassed ? (
              <div className="flex items-center gap-2 text-sm text-green-600 font-medium bg-green-50 border border-green-200 px-4 py-2 rounded-lg">
                <CheckCircle size={14} /> Quiz passed!
              </div>
            ) : null
          ) : (
            <div className="flex items-center gap-2 text-sm text-green-600 font-medium bg-green-50 border border-green-200 px-4 py-2 rounded-lg">
              <CheckCircle size={14} /> Studied
            </div>
          )}

          {!feynmanMode && sub.content && !isSubDone && (
            <button onClick={() => { setFeynmanMode(true); setFeynmanResult(null); setFeynmanText('') }}
              className="flex items-center gap-1.5 text-sm text-purple-600 border border-purple-200 px-4 py-2 rounded-lg hover:bg-purple-50 transition-colors font-medium">
              <Mic size={13} />Feynman mode
            </button>
          )}

          <button onClick={() => { if (subIdx < totalSubs - 1) router.push(`/roadmap/${roadmap.id}/module/${stage.id}/sub/${subIdx + 1}`) }}
            disabled={subIdx >= totalSubs - 1}
            className="text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            Next →
          </button>

          <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
            <Flame size={13} className="text-orange-400" />
            <span>{completedSubs.length} of {totalSubs} studied</span>
          </div>
        </div>
      </div>
    </div>
  )
}
