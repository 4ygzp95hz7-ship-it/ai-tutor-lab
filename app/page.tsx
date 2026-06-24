'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { BookOpen, ArrowRight, Brain, MessageSquare, Code2, Trophy, Star, Sparkles, CheckCircle, ChevronRight, Zap } from 'lucide-react'

const DEMO_MODULES = [
  { title: 'Mathematics Foundations', hours: '8h', delay: 500 },
  { title: 'Python for ML', hours: '6h', delay: 950 },
  { title: 'Supervised Learning', hours: '10h', delay: 1400 },
  { title: 'Neural Networks & Deep Learning', hours: '12h', delay: 1850 },
  { title: 'Model Evaluation & MLOps', hours: '8h', delay: 2300 },
]

const FEATURES = [
  { icon: Brain, title: 'Complete syllabus', desc: 'As many modules as your topic needs — zero compromise. Machine Learning gets 18 modules, not 8.', color: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
  { icon: BookOpen, title: 'Per-sub-module lessons', desc: 'Focused 300-500 word lessons per sub-topic. Read, understand, mark studied — tracked individually.', color: 'bg-green-50 text-green-600', border: 'border-green-100' },
  { icon: MessageSquare, title: 'AI doubt assistant', desc: '4-layer context: your module, lesson content, history, and real documentation. Never a generic answer.', color: 'bg-purple-50 text-purple-600', border: 'border-purple-100' },
  { icon: Code2, title: 'Coding exercises', desc: 'AI-generated challenges with progressive hints. Claude evaluates quality, not just test results.', color: 'bg-orange-50 text-orange-600', border: 'border-orange-100' },
  { icon: Trophy, title: 'Capstone project', desc: 'Portfolio-worthy project with milestone guidance, unlocked at 60% completion.', color: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
  { icon: Star, title: 'Interview prep', desc: 'Role-specific Q&A graded by AI. Weak areas mapped back to your roadmap for targeted review.', color: 'bg-rose-50 text-rose-600', border: 'border-rose-100' },
]

const STEPS = [
  { n: '01', title: 'Type any topic', desc: 'Machine Learning, React, System Design — anything you want to master.' },
  { n: '02', title: 'Get your curriculum', desc: 'Complete roadmap in under 12 seconds. Every module your topic needs.' },
  { n: '03', title: 'Learn with AI support', desc: 'Read lessons, do exercises, ask your AI tutor anything.' },
  { n: '04', title: 'Land the job', desc: 'Capstone project + AI-graded interview prep. Job-ready.' },
]

function ProgressRing({ pct, color, size = 48 }: { pct: number; color: string; size?: number }) {
  const [animated, setAnimated] = useState(false)
  const r = (size / 2) - 4
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 600); return () => clearTimeout(t) }, [])
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="3.5"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3.5"
          strokeDasharray={circ} strokeDashoffset={animated ? offset : circ}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)' }}/>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [visible, setVisible] = useState<number[]>([])
  const [activeFeature, setActiveFeature] = useState(0)
  const [isIn, setIsIn] = useState(false)

  useEffect(() => {
    setIsIn(true)
    DEMO_MODULES.forEach((m, i) => setTimeout(() => setVisible(p => [...p, i]), m.delay))
    const iv = setInterval(() => setActiveFeature(p => (p + 1) % FEATURES.length), 3000)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* ── STICKY NAV ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <BookOpen size={13} className="text-white" />
            </div>
            <span className="font-semibold text-gray-900 text-sm">AI Tutor Lab</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">Sign in</Link>
            <Link href="/login" className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-all hover:shadow-sm">
              Get started free <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO — full viewport ── */}
      <section className="min-h-[calc(100vh-56px)] flex items-center">
        <div className="w-full max-w-6xl mx-auto px-6 py-16 grid lg:grid-cols-2 gap-16 items-center">

          {/* Left copy */}
          <div className={`transition-all duration-700 ${isIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-5 border border-blue-100">
              <Zap size={11} /> Powered by Claude AI — no course limits
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-[1.1] tracking-tight mb-5">
              Learn anything.<br />
              <span className="text-blue-600">Complete curriculum,</span><br />
              built by AI.
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-lg">
              Type any topic. We build a full, uncompromised roadmap — every module, sub-module, and lesson — with an AI tutor that knows exactly where you are.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <Link href="/login" className="flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-blue-700 transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0">
                Start learning free <ArrowRight size={16} />
              </Link>
              <a href="#how" className="flex items-center gap-2 text-gray-700 border border-gray-200 px-5 py-3.5 rounded-xl hover:bg-gray-50 transition-colors font-medium">
                See how it works
              </a>
            </div>
            {/* Trust signals */}
            <div className="flex flex-wrap items-center gap-5 text-xs text-gray-400">
              {['No credit card', 'Free forever', 'No course to buy'].map(t => (
                <span key={t} className="flex items-center gap-1.5"><CheckCircle size={12} className="text-green-500" />{t}</span>
              ))}
            </div>
          </div>

          {/* Right — live demo */}
          <div className={`transition-all duration-700 delay-200 ${isIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 shadow-sm">
              {/* Demo header */}
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-3">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Live demo — generating a roadmap
              </div>

              {/* Search bar */}
              <div className="flex items-center gap-2.5 bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 shadow-sm">
                <Sparkles size={14} className="text-blue-500 flex-shrink-0" />
                <span className="text-gray-800 font-medium text-sm">Machine Learning</span>
                <span className="w-0.5 h-4 bg-blue-500 ml-0.5 animate-pulse" />
              </div>

              {/* Modules appearing */}
              <div className="space-y-2 mb-3">
                {DEMO_MODULES.map((m, i) => (
                  <div key={i} className={`flex items-center gap-3 bg-white border border-gray-100 rounded-lg px-3 py-2.5 transition-all duration-500 ${visible.includes(i) ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700 flex-1">{m.title}</span>
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{m.hours}</span>
                  </div>
                ))}
              </div>

              <p className={`text-xs text-gray-400 text-center transition-opacity duration-700 ${visible.length >= 5 ? 'opacity-100' : 'opacity-0'}`}>
                + 13 more modules →
              </p>

              {/* Mini roadmap preview */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-xs font-medium text-gray-500 mb-2">Progress preview</div>
                <div className="flex items-center gap-3">
                  <ProgressRing pct={42} color="#2563eb" size={44} />
                  <div className="flex-1">
                    {[
                      { label: 'Math Foundations', done: true },
                      { label: 'Supervised Learning', active: true },
                      { label: 'Neural Networks', locked: true },
                    ].map((r, i) => (
                      <div key={i} className="flex items-center gap-2 mb-1.5">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${r.done ? 'bg-green-500' : r.active ? 'bg-blue-500' : 'bg-gray-200'}`} />
                        <span className={`text-xs ${r.done ? 'text-gray-400 line-through' : r.active ? 'text-blue-600 font-medium' : 'text-gray-300'}`}>{r.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS — full width band ── */}
      <section className="bg-blue-600 py-12">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-3 gap-8 text-center">
          {[{ n: '∞', l: 'Modules — no cap, ever' }, { n: '<12s', l: 'Full roadmap generated' }, { n: '4-layer', l: 'AI context per doubt' }].map((s, i) => (
            <div key={i}>
              <div className="text-3xl font-bold text-white mb-1">{s.n}</div>
              <div className="text-sm text-blue-200">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES — full width, no wasted space ── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything you need to master any topic</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">Not a course. Not a chatbot. A real AI tutor that adapts to you.</p>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <div key={i} onClick={() => setActiveFeature(i)}
                  className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${activeFeature === i ? 'border-blue-200 shadow-md scale-[1.02] bg-blue-50/30' : `border-transparent bg-gray-50 hover:bg-white hover:border-gray-200 hover:shadow-sm`}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                    <Icon size={19} />
                  </div>
                  <h3 className={`text-sm font-bold mb-2 ${activeFeature === i ? 'text-blue-700' : 'text-gray-900'}`}>{f.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="py-20 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">From zero to job-ready in 4 steps</h2>
            <p className="text-gray-500 text-lg">The complete learning journey, powered by AI.</p>
          </div>
          <div className="grid grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <div key={i} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gray-200 z-0" style={{ width: 'calc(100% - 2rem)' }}>
                    <ChevronRight size={14} className="text-gray-300 absolute right-0 -top-[7px]" />
                  </div>
                )}
                <div className="relative z-10">
                  <div className="text-5xl font-black text-blue-100 mb-3 leading-none">{s.n}</div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA — full width, high contrast ── */}
      <section className="py-24 bg-gray-900">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-5xl font-bold text-white mb-4 leading-tight">
            Start learning for free.<br />
            <span className="text-blue-400">Right now.</span>
          </h2>
          <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
            No credit card. No course to buy. Just type what you want to learn — we handle everything else.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/login" className="flex items-center justify-center gap-3 bg-white text-gray-900 font-bold px-8 py-4 rounded-2xl hover:bg-gray-100 transition-all hover:scale-105 active:scale-100 text-sm">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </Link>
            <Link href="/login" className="flex items-center justify-center gap-3 bg-gray-800 text-white font-bold px-8 py-4 rounded-2xl hover:bg-gray-700 transition-all hover:scale-105 active:scale-100 text-sm border border-gray-700">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
              Continue with GitHub
            </Link>
          </div>
          <p className="text-gray-600 text-sm">No credit card · Free forever · Cancel any time</p>
        </div>
      </section>

      <footer className="bg-gray-900 border-t border-gray-800 py-6 text-center text-xs text-gray-600">
        © 2026 AI Tutor Lab · Powered by Claude AI
      </footer>
    </div>
  )
}
