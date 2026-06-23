import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Plus, Trash2 } from 'lucide-react'

export default async function RoadmapListPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const roadmaps = await prisma.roadmap.findMany({
    where: { userId: session.user.id },
    include: { stages: { select: { status: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My roadmaps</h1>
          <p className="text-sm text-gray-500 mt-0.5">{roadmaps.length} total</p>
        </div>
        <Link href="/roadmap/new" className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus size={15} /> New roadmap
        </Link>
      </div>

      {roadmaps.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📚</div>
          <h3 className="font-semibold text-gray-900 mb-1">No roadmaps yet</h3>
          <p className="text-sm text-gray-500 mb-4">Create your first personalized learning roadmap.</p>
          <Link href="/roadmap/new" className="inline-block bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Create roadmap
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {roadmaps.map(r => {
            const done = r.stages.filter(s => s.status === 'completed').length
            return (
              <div key={r.id} className="bg-white border border-gray-100 rounded-xl p-4 flex gap-4">
                <Link href={`/roadmap/${r.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{r.title}</h3>
                    <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${r.status === 'active' ? 'bg-blue-50 text-blue-700' : r.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{r.status}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">{r.topic} · {r.stages.length} modules · {done} completed</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${r.progressPct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 font-medium">{r.progressPct}%</span>
                  </div>
                </Link>
                <form action={async () => {
                  'use server'
                  // deletion handled client-side
                }}>
                  <Link href={`/roadmap/${r.id}`} className="text-xs text-blue-600 hover:underline font-medium self-center">View →</Link>
                </form>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
