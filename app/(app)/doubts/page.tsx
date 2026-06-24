import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { MessageCircleQuestion, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default async function DoubtsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id as string

  // Get all doubt sessions grouped by stage
  const messages = await prisma.chatMessage.findMany({
    where: { userId, role: 'user' },
    include: { stage: { include: { roadmap: { select: { id: true, topic: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  // Group by sessionId
  const grouped = messages.reduce<Record<string, typeof messages>>((acc, msg) => {
    const key = msg.sessionId
    if (!acc[key]) acc[key] = []
    acc[key].push(msg)
    return acc
  }, {})

  const sessions = Object.entries(grouped).map(([sessionId, msgs]) => ({
    sessionId,
    stage: msgs[0].stage,
    latestQuestion: msgs[0].content,
    questionCount: msgs.length,
    lastAt: msgs[0].createdAt,
    roadmapId: msgs[0].stage?.roadmap?.id,
    topic: msgs[0].stage?.roadmap?.topic ?? 'General',
    stageTitle: msgs[0].stage?.title ?? 'General',
  }))

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Saved doubts</h1>
      <p className="text-sm text-gray-500 mb-6">All your AI tutor conversations, organised by module.</p>

      {sessions.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageCircleQuestion size={24} className="text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">No doubts yet</h3>
          <p className="text-sm text-gray-400 mb-4">Open any module and click "Ask AI about this module" to start a conversation.</p>
          <Link href="/roadmap" className="text-sm text-blue-600 hover:underline">Go to your roadmaps →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => (
            <Link
              key={s.sessionId}
              href={s.roadmapId ? `/roadmap/${s.roadmapId}` : '/dashboard'}
              className="block bg-white border border-gray-100 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{s.topic}</span>
                    <span className="text-xs text-gray-400">{s.stageTitle}</span>
                  </div>
                  <p className="text-sm text-gray-700 truncate">{s.latestQuestion}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-400">{s.questionCount} question{s.questionCount > 1 ? 's' : ''}</span>
                    <span className="text-gray-200">·</span>
                    <span className="text-xs text-gray-400">{formatDate(s.lastAt)}</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
