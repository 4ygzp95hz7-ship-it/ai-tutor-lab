import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const role = (session.user as { role?: string }).role
  if (role !== 'admin') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-3">
          <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <span className="font-semibold text-gray-900 text-sm">Admin Dashboard</span>
          <span className="text-gray-300 text-sm">·</span>
          <span className="text-sm text-gray-500">AI Tutor Lab</span>
          <a href="/dashboard" className="ml-auto text-xs text-blue-600 hover:underline">← Back to app</a>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
    </div>
  )
}
