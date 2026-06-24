'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { BookOpen, ArrowRight, Play, Sparkles, Brain, Code2, Trophy, MessageSquare, ChevronRight, Zap, Star } from 'lucide-react'

const DEMO_MODULES = [
  { title: 'Mathematics Foundations', hours: '8h', delay: 600 },
  { title: 'Python for ML', hours: '6h', delay: 1000 },
  { title: 'Supervised Learning', hours: '10h', delay: 1400 },
  { title: 'Neural Networks & Deep Learning', hours: '12h', delay: 1800 },
  { title: 'Model Evaluation & MLOps', hours: '8h', delay: 2200 },
]

const FEATURES = [
  { icon: Brain, title: 'No syllabus compromise', desc: 'As many modules and sub-modules as your topic genuinely requires — never capped at an arbitrary number.', color: 'bg-blue-50 text-blue-600' },
  { icon: BookOpen, title: 'Per-sub-module lessons', desc: 'Focused 300-500 word lessons per sub-topic. Read, understand, mark as studied — tracked individually.', color: 'bg-green-50 text-green-600' },
  { icon: MessageSquare, title: 'AI doubt assistant', desc: '4-layer context: your module, lesson content, conversation history, and real documentation. Never a generic answer.', color: 'bg-purple-50 text-purple-600' },
  { icon: Code2, title: 'Coding exercises', desc: 'AI-generated challenges with progressive hints. Claude evaluates your code for quality, not just tests.', color: 'bg-orange-50 text-orange-600' },
  { icon: Trophy, title: 'Capstone project', desc: 'A portfolio-worthy project with milestone guidance, unlocked after 60% completion.', color: 'bg-amber-50 text-amber-600' },
  { icon: Star, title: 'Interview prep', desc: 'Role-specific Q&A graded by AI. Weak areas mapped back to your roadmap for targeted review.', color: 'bg-rose-50 text-rose-600' },
]

const STEPS = [
  { n: '01', title: 'Type any topic', desc: '"Machine Learning", "React", "System Design" — anything you want to master.' },
  { n: '02', title: 'Get your curriculum', desc: 'A complete, personalized roadmap in under 12 seconds. Every module your topic needs.' },
  { n: '03', title: 'Learn with AI support', desc: 'Read lessons, do exercises, ask your AI tutor anything — it always has full context.' },
  { n: '04', title: 'Land the job', desc: 'Capstone project for your portfolio. AI-graded interview prep. Job-ready.' },
]

function RingProgress({ pct, color, size = 52 }: { pct: number; color: string; size?: number }) {
  const [animated, setAnimated] = useState(false)
  const r = (size / 2) - 4
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  useEffect(() => { const t = setTimeout(() => setAnimated(true), 300); return () => clearTimeout(t) }, [])

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="4"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={animated ? offset : circ}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}/>
    </svg>
  )
}

export default function LandingPage() {
  const [visibleModules, setVisibleModules] = useState<number[]>([])
  const [activeFeature, setActiveFeature] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsVisible(true)
    DEMO_MODULES.forEach((m, i) => {
      setTimeout(() => setVisibleModules(prev => [...prev, i]), m.delay)
    })
    const interval = setInterval(() => {
      setActiveFeature(p => (p + 1) % FEATURES.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <BookOpen size={14} className="text-white" />
            </div>
            <span className="font-semibold text-gray-900">AI Tutor Lab</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Sign in</Link>
            <Link href="/login" className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Get started <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="max-w-5xl mx-auto px-5 pt-20 pb-16">
        <div className={`text-center transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-blue-100">
            <Zap size={13} />
            Powered by Claude AI — no course limits
          </div>

          <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-5 tracking-tight">
            Learn anything.<br />
            <span className="text-blue-600">Your complete curriculum,</span><br />
            built by AI.
          </h1>

          <p className="text-lg text-gray-500 max-w-lg mx-auto mb-8 leading-relaxed">
            Type any topic. We build a full, uncompromised roadmap — every module, lesson, and sub-module — with an AI tutor that knows exactly where you are.
          </p>

          <div className="flex items-center justify-center gap-3 mb-14">
            <Link href="/login" className="flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 transition-all hover:scale-105 active:scale-95">
              Start learning free <ArrowRight size={16} />
            </Link>
            <button className="flex items-center gap-2 text-gray-600 border border-gray-200 px-5 py-3 rounded-xl hover:bg-gray-50 transition-colors font-medium">
              <Play size={14} className="text-gray-400" /> See how it works
            </button>
          </div>

          {/* Live demo card */}
          <div className="max-w-lg mx-auto bg-gray-50 border border-gray-200 rounded-2xl p-5 text-left shadow-sm">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-3 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500" style={{ animation: 'pulse 2s infinite' }} />
              Live demo — AI generating your roadmap
            </div>

            {/* Search bar */}
            <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 shadow-sm">
              <Sparkles size={15} className="text-blue-500 flex-shrink-0" />
              <span className="text-gray-800 font-medium">Machine Learning</span>
              <span className="w-0.5 h-4 bg-blue-500 ml-0.5" style={{ animation: 'blink-cursor 0.8s infinite' }} />
            </div>

            {/* Modules appearing */}
            <div className="space-y-2">
              {DEMO_MODULES.map((m, i) => (
                <div key={i} className={`flex items-center gap-3 bg-white border border-gray-100 rounded-lg px-3 py-2.5 transition-all duration-500 ${visibleModules.includes(i) ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3'}`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700 flex-1">{m.title}</span>
                  <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{m.hours}</span>
                </div>
              ))}
              <p className={`text-xs text-gray-400 text-center pt-1 transition-opacity duration-700 ${visibleModules.length >= 5 ? 'opacity-100' : 'opacity-0'}`}>
                + 13 more modules generated →
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-100 bg-gray-50">
        <div className="max-w-5xl mx-auto px-5 py-10 grid grid-cols-3 gap-8 text-center">
          {[
            { n: '∞', label: 'Modules — no cap, ever' },
            { n: '<12s', label: 'Full roadmap generated' },
            { n: '4-layer', label: 'AI context per doubt' },
          ].map((s, i) => (
            <div key={i} className={`animate-fade-up delay-${(i+1)*100} opacity-0`}>
              <div className="text-3xl font-bold text-blue-600 mb-1">{s.n}</div>
              <div className="text-sm text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-5 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Everything you need to master any topic</h2>
          <p className="text-gray-500">Not a course. Not a chatbot. A personal AI tutor.</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <div key={i}
                onClick={() => setActiveFeature(i)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 ${activeFeature === i ? 'border-blue-200 bg-blue-50 shadow-sm scale-105' : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'}`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${f.color}`}>
                  <Icon size={18} />
                </div>
                <h3 className={`text-sm font-semibold mb-1.5 ${activeFeature === i ? 'text-blue-700' : 'text-gray-900'}`}>{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 border-y border-gray-100 py-20">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">From zero to job-ready in 4 steps</h2>
            <p className="text-gray-500">The complete learning journey, powered entirely by AI.</p>
          </div>
          <div className="grid grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <div key={i} className={`animate-fade-up opacity-0 delay-${(i+1)*100}`}>
                <div className="text-3xl font-bold text-blue-100 mb-3">{s.n}</div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
                {i < STEPS.length - 1 && (
                  <ChevronRight size={16} className="text-gray-300 mt-3 hidden" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample roadmap preview */}
      <section className="max-w-5xl mx-auto px-5 py-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">See your roadmap in action</h2>
          <p className="text-gray-500">A real Machine Learning roadmap — with sub-modules, lessons, and progress tracking.</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm max-w-2xl mx-auto">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Machine Learning Mastery</h3>
              <p className="text-xs text-gray-400 mt-0.5">18 modules · 42% complete</p>
            </div>
            <div className="flex items-center gap-2">
              <RingProgress pct={42} color="#2563eb" size={44} />
              <span className="text-sm font-bold text-blue-600">42%</span>
            </div>
          </div>
          {[
            { title: 'Mathematics Foundations', subs: 4, done: 4, status: 'done' },
            { title: 'Supervised Learning', subs: 4, done: 2, status: 'active' },
            { title: 'Neural Networks', subs: 5, done: 0, status: 'locked' },
          ].map((m, i) => (
            <div key={i} className={`flex items-center gap-4 px-5 py-3.5 border-b border-gray-50 last:border-0 ${m.status === 'active' ? 'bg-blue-50/50' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${m.status === 'done' ? 'bg-green-100' : m.status === 'active' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                {m.status === 'done' && <span className="text-green-600 text-xs">✓</span>}
                {m.status === 'active' && <span className="text-blue-600 text-xs">▶</span>}
                {m.status === 'locked' && <span className="text-gray-400 text-xs">🔒</span>}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-800">{m.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1 bg-gray-100 rounded-full max-w-24 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(m.done/m.subs)*100}%`, transition: 'width 1s ease' }} />
                  </div>
                  <span className="text-xs text-gray-400">{m.done}/{m.subs} studied</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-blue-600 py-20">
        <div className="max-w-xl mx-auto px-5 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Start learning for free</h2>
          <p className="text-blue-200 mb-8 text-base">No credit card. No course to buy. Just type what you want to learn.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login" className="flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold px-6 py-3.5 rounded-xl hover:bg-gray-50 transition-all hover:scale-105">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </Link>
            <Link href="/login" className="flex items-center justify-center gap-3 bg-gray-900 text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-gray-800 transition-all hover:scale-105">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
              Continue with GitHub
            </Link>
          </div>
          <p className="text-blue-300 text-xs mt-4">Free forever · No credit card required</p>
        </div>
      </section>

      <footer className="py-6 text-center text-xs text-gray-400 border-t border-gray-100">
        © 2026 AI Tutor Lab · Powered by Claude AI
      </footer>
    </div>
  )
}
