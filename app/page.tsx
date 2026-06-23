import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function HomePage() {
  const session = await auth()
  if (session?.user) redirect('/dashboard')

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center">
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <span>Powered by Claude AI</span>
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-4 leading-tight">
          Your personal AI tutor for{' '}
          <span className="text-blue-600">any topic</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 leading-relaxed">
          Enter any topic. We build your complete, uncompromised learning roadmap —
          as many modules as you need, an AI doubt assistant that knows exactly where you are,
          exercises, a capstone project, and interview prep.
        </p>
        <Link
          href="/login"
          className="inline-block bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors"
        >
          Start Learning Free →
        </Link>
        <div className="mt-12 grid grid-cols-3 gap-6 text-center">
          <div><div className="text-2xl font-bold text-gray-900">∞</div><div className="text-sm text-gray-500 mt-1">Modules, no cap</div></div>
          <div><div className="text-2xl font-bold text-gray-900">4-layer</div><div className="text-sm text-gray-500 mt-1">AI context for doubts</div></div>
          <div><div className="text-2xl font-bold text-gray-900">100%</div><div className="text-sm text-gray-500 mt-1">Personalized to you</div></div>
        </div>
      </div>
    </main>
  )
}
