'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard, Map, Code, MessageCircleQuestion,
  Briefcase, UserCheck, User, LogOut, BookOpen, Flame, ShieldAlert,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { useState } from 'react'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/roadmap', label: 'Roadmaps', icon: Map },
  { href: '/practice', label: 'Practice', icon: Code },
  { href: '/doubts', label: 'Doubts', icon: MessageCircleQuestion },
  { href: '/project', label: 'Projects', icon: Briefcase },
  { href: '/interview', label: 'Interview Prep', icon: UserCheck },
  { href: '/profile', label: 'Profile', icon: User },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = (session?.user as { role?: string })?.role === 'admin'
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="hidden md:flex w-52 flex-col bg-white border-r border-gray-100">
        <div className="flex items-center gap-2 p-4 border-b border-gray-100">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <BookOpen size={14} className="text-white" />
          </div>
          <span className="font-semibold text-sm text-gray-900">AI Tutor Lab</span>
        </div>

        <nav className="flex-1 py-2">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 mx-2 rounded-lg text-sm transition-colors',
                pathname.startsWith(href)
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>

        {isAdmin && (
          <Link href="/admin" className={cn('flex items-center gap-2.5 px-3 py-2 mx-2 rounded-lg text-sm transition-colors mb-1', pathname.startsWith('/admin') ? 'bg-red-50 text-red-700 font-medium' : 'text-gray-500 hover:bg-gray-50')}>
            <ShieldAlert size={15} /> Admin
          </Link>
        )}

        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700">
              {session?.user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{session?.user?.name}</p>
              <p className="text-xs text-gray-400">Pro plan</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors w-full"
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-12 bg-white border-b border-gray-100 flex items-center px-4 gap-3">
          <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 max-w-xs">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Enter a topic to learn…"
              className="bg-transparent text-xs text-gray-700 outline-none w-full placeholder-gray-400"
              onKeyDown={e => { if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) { window.location.href = `/roadmap/new?topic=${encodeURIComponent((e.target as HTMLInputElement).value.trim())}` } }}
            />
          </div>

          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Flame size={13} className="text-orange-500" />
              <span className="font-medium text-gray-700">Streak</span>
            </div>
            <div className="text-xs text-gray-500">
              Confidence: <span className="font-semibold text-gray-800">78/100</span>
            </div>
            <button
              onClick={() => setChatOpen(true)}
              className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <MessageCircleQuestion size={13} />
              AI Tutor
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  )
}
