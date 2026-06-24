'use client'

import { useState, useEffect } from 'react'
import { Briefcase, Lock, Sparkles, Loader2, CheckCircle, Circle, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { parseJSON, cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface Milestone { title: string; description: string; tasks: string[]; estimatedHours: number }
interface Project { id: string; title: string; milestones: string; status: string; githubUrl: string }
interface Roadmap { id: string; topic: string; title: string; progressPct: number; project?: Project }

export default function ProjectPage() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)
  const [expandedMilestone, setExpandedMilestone] = useState<number | null>(0)

  useEffect(() => {
    fetch('/api/roadmaps')
      .then(r => r.json())
      .then(async ({ roadmaps: rms }) => {
        // For each roadmap, check if it has a project
        const withProjects = await Promise.all((rms ?? []).map(async (rm: Roadmap) => {
          try {
            const res = await fetch(`/api/roadmaps/${rm.id}`)
            const data = await res.json()
            return { ...rm, project: data.roadmap?.project }
          } catch { return rm }
        }))
        setRoadmaps(withProjects)
      })
      .finally(() => setLoading(false))
  }, [])

  async function generateProject(roadmapId: string) {
    setGenerating(roadmapId)
    try {
      const res = await fetch('/api/project/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roadmapId }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed to generate project'); return }
      setRoadmaps(prev => prev.map(rm => rm.id === roadmapId ? { ...rm, project: data.project } : rm))
      toast.success('Capstone project generated!')
      setExpandedMilestone(0)
    } catch { toast.error('Failed to generate project') }
    finally { setGenerating(null) }
  }

  if (loading) return <div className="max-w-3xl mx-auto p-6 space-y-4">{[1,2].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}</div>

  const eligibleRoadmaps = roadmaps.filter(r => r.progressPct >= 60)
  const inProgressRoadmaps = roadmaps.filter(r => r.progressPct > 0 && r.progressPct < 60)

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Capstone Projects</h1>
        <p className="text-sm text-gray-500 mt-0.5">Build a portfolio-worthy project once you've mastered a topic.</p>
      </div>

      {roadmaps.length === 0 && (
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Briefcase size={24} className="text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">No roadmaps yet</h3>
          <p className="text-sm text-gray-400 mb-4">Create a roadmap and complete 60% of it to unlock your capstone project.</p>
          <Link href="/roadmap/new" className="inline-block bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Create a roadmap</Link>
        </div>
      )}

      {/* Eligible roadmaps — show project or generate button */}
      {eligibleRoadmaps.map(roadmap => {
        const milestones = parseJSON<Milestone[]>(roadmap.project?.milestones ?? '[]', [])
        const hasProject = milestones.length > 0

        return (
          <div key={roadmap.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden mb-4">
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                      {roadmap.progressPct}% complete
                    </span>
                    {roadmap.progressPct === 100 && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">Mastered ✓</span>}
                  </div>
                  <h2 className="font-semibold text-gray-900">{roadmap.title}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{roadmap.topic}</p>
                </div>
                {!hasProject && (
                  <button
                    onClick={() => generateProject(roadmap.id)}
                    disabled={generating === roadmap.id}
                    className="flex-shrink-0 flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
                  >
                    {generating === roadmap.id
                      ? <><Loader2 size={13} className="animate-spin" /> Generating…</>
                      : <><Sparkles size={13} /> Generate project</>}
                  </button>
                )}
              </div>
            </div>

            {hasProject && (
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 text-sm">{roadmap.project?.title ?? `${roadmap.topic} Capstone`}</h3>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', roadmap.project?.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700')}>
                    {roadmap.project?.status === 'completed' ? 'Completed' : 'In Progress'}
                  </span>
                </div>

                <div className="space-y-2">
                  {milestones.map((m, i) => (
                    <div key={i} className="border border-gray-100 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedMilestone(expandedMilestone === i ? null : i)}
                        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full border-2 border-gray-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs text-gray-400 font-medium">{i + 1}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{m.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{m.estimatedHours}h estimated</p>
                        </div>
                        {expandedMilestone === i ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                      </button>

                      {expandedMilestone === i && (
                        <div className="px-4 pb-4 border-t border-gray-50">
                          <p className="text-sm text-gray-600 mt-3 mb-3 leading-relaxed">{m.description}</p>
                          {m.tasks?.length > 0 && (
                            <div className="space-y-1.5">
                              {m.tasks.map((task, ti) => (
                                <div key={ti} className="flex items-start gap-2 text-sm text-gray-600">
                                  <Circle size={12} className="text-gray-300 mt-1 flex-shrink-0" />
                                  {task}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex gap-3">
                  <Link href={`/roadmap/${roadmap.id}`} className="text-sm text-blue-600 hover:underline">← Back to roadmap</Link>
                  {roadmap.project?.githubUrl && (
                    <a href={roadmap.project.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800">
                      <ExternalLink size={12} /> View on GitHub
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Locked roadmaps — show progress needed */}
      {inProgressRoadmaps.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-6">Complete more to unlock</h2>
          {inProgressRoadmaps.map(roadmap => (
            <Link key={roadmap.id} href={`/roadmap/${roadmap.id}`} className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-4 mb-3 hover:border-gray-200 transition-colors">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Lock size={16} className="text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{roadmap.title}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${roadmap.progressPct}%` }} />
                  </div>
                  <span className="text-xs text-gray-400">{roadmap.progressPct}% · need 60%</span>
                </div>
              </div>
              <ChevronRight size={14} className="text-gray-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
