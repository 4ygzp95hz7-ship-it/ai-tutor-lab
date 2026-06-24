'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard, Map, Code, MessageCircleQuestion,
  Briefcase, UserCheck, User, LogOut, BookOpen,
  Flame, Star, Bot, ShieldAlert, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { useState, useEffect } from 'react'

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/roadmap', icon: Map, label: 'Roadmaps' },
  { href: '/practice', icon: Code, label: 'Practice' },
  { href: '/doubts', icon: MessageCircleQuestion, label: 'Doubts' },
  { href: '/project', icon: Briefcase, label: 'Projects' },
  { href: '/interview', icon: UserCheck, label: 'Interview prep' },
  { href: '/profile', icon: User, label: 'Profile' },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [chatOpen, setChatOpen] = useState(false)
  const [streak, setStreak] = useState(0)
  const isAdmin = (session?.user as { role?: string })?.role === 'admin'

  useEffect(() => {
    fetch('/api/streak').then(r => r.json()).then(({ streak }) => {
      setStreak(streak?.currentStreak ?? 0)
    }).catch(() => {})
  }, [])

  const initials = session?.user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'U'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* Icon sidebar */}
      <aside className="w-14 min-w-14 flex flex-col items-center bg-white border-r border-gray-100 py-3 gap-1">
        {/* Logo */}
        <Link href="/dashboard" className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mb-3 hover:bg-blue-700 transition-colors">
          <BookOpen size={14} className="text-white" />
        </Link>

        {/* Nav icons */}
        {NAV.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} title={label}
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center transition-all group relative',
              pathname.startsWith(href)
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
            )}
          >
            <Icon size={17} />
            {/* Tooltip */}
            <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              {label}
            </span>
          </Link>
        ))}

        {/* Admin link */}
        {isAdmin && (
          <Link href="/admin" title="Admin" className={cn('w-9 h-9 rounded-lg flex items-center justify-center transition-all group relative mt-1', pathname.startsWith('/admin') ? 'bg-red-50 text-red-600' : 'text-gray-300 hover:bg-gray-50 hover:text-gray-500')}>
            <ShieldAlert size={16} />
            <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">Admin</span>
          </Link>
        )}

        {/* Bottom */}
        <div className="mt-auto flex flex-col items-center gap-2">
          <button onClick={() => signOut({ callbackUrl: '/login' })} title="Sign out"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-300 hover:bg-gray-50 hover:text-gray-500 transition-all group relative">
            <LogOut size={15} />
            <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">Sign out</span>
          </button>
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700">
            {initials}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-12 bg-white border-b border-gray-100 flex items-center px-5 gap-3 shrink-0">
          {/* Search */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 h-8 flex-1 max-w-72 group focus-within:border-blue-300 focus-within:bg-white transition-all">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Search or start a new topic…"
              className="bg-transparent text-xs text-gray-700 outline-none w-full placeholder-gray-400"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value.trim()
                  if (val) window.location.href = `/roadmap/new?topic=${encodeURIComponent(val)}`
                }
              }}
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Streak */}
            {streak > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-100">
                <Flame size={12} className="text-orange-500" />
                {streak} day streak
              </div>
            )}

            {/* Confidence */}
            <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-blue-100">
              <Star size={12} />
              78/100
            </div>

            {/* AI Tutor button */}
            <button onClick={() => setChatOpen(true)}
              className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
              <Bot size={13} />
              Ask AI
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  )
}
