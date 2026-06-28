'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard, Map, Code, MessageCircleQuestion,
  Briefcase, UserCheck, User, LogOut, BookOpen,
  Flame, Star, Bot, ShieldAlert, Menu, X, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { useState, useEffect } from 'react'

const BOTTOM_TABS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/roadmap', icon: Map, label: 'Learn' },
  { href: '/practice', icon: Code, label: 'Practice' },
  { href: '/interview', icon: UserCheck, label: 'Interview' },
]

const SIDEBAR_NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/roadmap', icon: Map, label: 'Roadmaps' },
  { href: '/practice', icon: Code, label: 'Practice' },
  { href: '/doubts', icon: MessageCircleQuestion, label: 'Doubts' },
  { href: '/project', icon: Briefcase, label: 'Projects' },
  { href: '/interview', icon: UserCheck, label: 'Interview prep' },
  { href: '/profile', icon: User, label: 'Profile' },
]

const DRAWER_EXTRA = [
  { href: '/doubts', icon: MessageCircleQuestion, label: 'Doubts' },
  { href: '/project', icon: Briefcase, label: 'Projects' },
  { href: '/profile', icon: User, label: 'Profile' },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [chatOpen, setChatOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [streak, setStreak] = useState(0)
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null)

  const isAdmin = (session?.user as { role?: string })?.role === 'admin'
  const initials = session?.user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'U'

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(({ streak, confidenceScore, hasActivity }) => {
      setStreak(streak?.currentStreak ?? 0)
      setConfidenceScore(hasActivity ? confidenceScore : null)
    }).catch(() => {})
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* ── DESKTOP: Icon sidebar (hidden on mobile) ── */}
      <aside className="hidden md:flex w-14 min-w-14 flex-col items-center bg-white border-r border-gray-100 py-3 gap-1">
        <Link href="/dashboard" className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mb-3 hover:bg-blue-700 transition-colors">
          <BookOpen size={14} className="text-white" />
        </Link>
        {SIDEBAR_NAV.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} title={label}
            className={cn('w-9 h-9 rounded-lg flex items-center justify-center transition-all group relative',
              pathname.startsWith(href) ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600')}>
            <Icon size={17} />
            <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">{label}</span>
          </Link>
        ))}
        {isAdmin && (
          <Link href="/admin" title="Admin" className={cn('w-9 h-9 rounded-lg flex items-center justify-center transition-all group relative mt-1', pathname.startsWith('/admin') ? 'bg-red-50 text-red-600' : 'text-gray-300 hover:bg-gray-50 hover:text-gray-500')}>
            <ShieldAlert size={16} />
            <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">Admin</span>
          </Link>
        )}
        <div className="mt-auto flex flex-col items-center gap-2">
          <button onClick={() => signOut({ callbackUrl: '/login' })} title="Sign out"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-300 hover:bg-gray-50 hover:text-gray-500 transition-all">
            <LogOut size={15} />
          </button>
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700">{initials}</div>
        </div>
      </aside>

      {/* ── MOBILE: Drawer overlay ── */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute top-0 left-0 bottom-0 w-72 bg-white shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Drawer header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <BookOpen size={14} className="text-white" />
                </div>
                <span className="font-semibold text-gray-900">AI Tutor Lab</span>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>

            {/* User info */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700">{initials}</div>
              <div>
                <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
                <p className="text-xs text-gray-400">{session?.user?.email}</p>
              </div>
            </div>

            {/* Extra nav items */}
            <nav className="flex-1 py-2">
              {DRAWER_EXTRA.map(({ href, icon: Icon, label }) => (
                <Link key={href} href={href} onClick={() => setDrawerOpen(false)}
                  className={cn('flex items-center gap-3 px-5 py-3 text-sm transition-colors',
                    pathname.startsWith(href) ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-600 hover:bg-gray-50')}>
                  <Icon size={18} />
                  {label}
                  <ChevronRight size={14} className="ml-auto text-gray-300" />
                </Link>
              ))}
              {isAdmin && (
                <Link href="/admin" onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 px-5 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors">
                  <ShieldAlert size={18} />Admin
                </Link>
              )}
            </nav>

            {/* Sign out */}
            <div className="p-5 border-t border-gray-100">
              <button onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors w-full">
                <LogOut size={16} /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-12 bg-white border-b border-gray-100 flex items-center px-3 md:px-5 gap-2 shrink-0">
          {/* Mobile: hamburger for logo area */}
          <button className="md:hidden flex items-center gap-2" onClick={() => setDrawerOpen(true)}>
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <BookOpen size={13} className="text-white" />
            </div>
          </button>

          {/* Search */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 h-8 flex-1 max-w-xs md:max-w-72 group focus-within:border-blue-300 focus-within:bg-white transition-all">
            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Search or start a new topic…"
              className="bg-transparent text-xs text-gray-700 outline-none w-full placeholder-gray-400"
              onKeyDown={e => { if (e.key === 'Enter') { const v = (e.target as HTMLInputElement).value.trim(); if (v) window.location.href = `/roadmap/new?topic=${encodeURIComponent(v)}` } }}
            />
          </div>

          <div className="ml-auto flex items-center gap-1.5 md:gap-2">
            {streak > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-1.5 rounded-full border border-amber-100">
                <Flame size={12} className="text-orange-500" />{streak}
              </div>
            )}
            {confidenceScore !== null && (
              <div className="hidden sm:flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1.5 rounded-full border border-blue-100">
                <Star size={12} />{confidenceScore}/100
              </div>
            )}
            <button onClick={() => setChatOpen(true)}
              className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-2.5 md:px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
              <Bot size={13} />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </div>
        </header>

        {/* Content — extra bottom padding on mobile for tab bar */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
      </div>

      {/* ── MOBILE: Bottom tab bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-30 safe-bottom">
        {BOTTOM_TABS.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href} className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors">
              <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center transition-all',
                active ? 'bg-blue-50' : '')}>
                <Icon size={18} className={active ? 'text-blue-600' : 'text-gray-400'} />
              </div>
              <span className={cn('text-[10px] font-medium', active ? 'text-blue-600' : 'text-gray-400')}>{label}</span>
            </Link>
          )
        })}
        {/* More button */}
        <button onClick={() => setDrawerOpen(true)} className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center">
            <Menu size={18} className="text-gray-400" />
          </div>
          <span className="text-[10px] font-medium text-gray-400">More</span>
        </button>
      </nav>

      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  )
}
