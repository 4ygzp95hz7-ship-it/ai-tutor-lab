'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Flame, Trophy, Copy, Brain, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

const INDUSTRIES = [
  { value: '', label: 'General / No preference' },
  { value: 'finance', label: 'Finance & Banking' },
  { value: 'healthcare', label: 'Healthcare & Medicine' },
  { value: 'e-commerce', label: 'E-commerce & Retail' },
  { value: 'gaming', label: 'Gaming & Entertainment' },
  { value: 'logistics', label: 'Logistics & Supply Chain' },
  { value: 'education', label: 'Education & EdTech' },
  { value: 'social media', label: 'Social Media & Content' },
  { value: 'cybersecurity', label: 'Cybersecurity' },
  { value: 'real estate', label: 'Real Estate & PropTech' },
  { value: 'manufacturing', label: 'Manufacturing & IoT' },
  { value: 'marketing', label: 'Marketing & AdTech' },
]

interface WeakSpot {
  stageId: string; title: string; topic: string; roadmapId: string
  weaknessScore: number; failedRecalls: number; doubtCount: number; lowExerciseCount: number
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const [user, setUser] = useState<{ experienceLevel: string; industryDomain: string; email: string; name: string } | null>(null)
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0 })
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [referralCount, setReferralCount] = useState(0)
  const [weakSpots, setWeakSpots] = useState<WeakSpot[]>([])
  const [saving, setSaving] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState('beginner')
  const [selectedIndustry, setSelectedIndustry] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/profile').then(r => r.json()),
      fetch('/api/stats').then(r => r.json()),
      fetch('/api/referral').then(r => r.json()),
      fetch('/api/weakspots').then(r => r.json()),
    ]).then(([profileData, statsData, refData, wsData]) => {
      setUser(profileData.user)
      setSelectedLevel(profileData.user?.experienceLevel ?? 'beginner')
      setSelectedIndustry(profileData.user?.industryDomain ?? '')
      setStreak(statsData.streak ?? { currentStreak: 0, longestStreak: 0 })
      setReferralCode(refData.code)
      setReferralCount(refData.completedReferrals ?? 0)
      setWeakSpots(wsData.weakSpots ?? [])
    }).catch(() => {})
  }, [])

  async function saveSettings() {
    setSaving(true)
    try {
      await fetch('/api/profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ experienceLevel: selectedLevel, industryDomain: selectedIndustry }),
      })
      toast.success('Settings saved! Future lessons will use your industry examples.')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const initials = session?.user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'U'
  const appUrl = 'https://ai-tutor-lab-nine.vercel.app'
  const referralUrl = referralCode ? `${appUrl}/ref/${referralCode}` : null

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Profile</h1>

      {/* Identity */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-700">{initials}</div>
        <div>
          <p className="font-semibold text-gray-900">{user?.name ?? session?.user?.name}</p>
          <p className="text-sm text-gray-500">{user?.email ?? session?.user?.email}</p>
          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full mt-1 inline-block font-medium">Pro plan</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 text-orange-500 mb-2"><Flame size={16} /><span className="text-xs font-medium text-gray-500">Current streak</span></div>
          <div className="text-3xl font-bold text-gray-900">{streak.currentStreak}<span className="text-sm text-gray-400 ml-1">days</span></div>
          <div className="text-xs text-gray-400 mt-0.5">Longest: {streak.longestStreak} days</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 text-blue-500 mb-2"><Trophy size={16} /><span className="text-xs font-medium text-gray-500">Referrals</span></div>
          <div className="text-3xl font-bold text-gray-900">{referralCount}</div>
          <div className="text-xs text-gray-400 mt-0.5">successful · {referralCount} month{referralCount !== 1 ? 's' : ''} Pro earned</div>
        </div>
      </div>

      {/* Personalisation settings */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <h2 className="font-semibold text-gray-900 mb-1">Learning preferences</h2>
        <p className="text-xs text-gray-500 mb-4">These settings personalise your lessons, exercises, and examples.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Experience level</label>
            <div className="flex gap-2">
              {['beginner', 'intermediate', 'advanced'].map(l => (
                <button key={l} onClick={() => setSelectedLevel(l)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all capitalize ${selectedLevel === l ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">
              Your industry <span className="text-gray-400 font-normal">— lessons and exercises will use examples from your world</span>
            </label>
            <select value={selectedIndustry} onChange={e => setSelectedIndustry(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400 transition bg-white">
              {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
            </select>
            {selectedIndustry && (
              <p className="text-xs text-blue-600 mt-1.5">
                ✓ Future lessons will use <strong>{selectedIndustry}</strong> examples. New sub-modules generated will be industry-specific.
              </p>
            )}
          </div>

          <button onClick={saveSettings} disabled={saving}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Save preferences'}
          </button>
        </div>
      </div>

      {/* Weak spots */}
      {weakSpots.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-amber-500" />
            <h2 className="font-semibold text-gray-900">Concepts to strengthen</h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">Based on your recall quiz scores, doubts asked, and exercise performance.</p>
          <div className="space-y-2">
            {weakSpots.map((ws, i) => (
              <Link key={i} href={`/roadmap/${ws.roadmapId}`}
                className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 hover:border-amber-300 transition-colors">
                <Brain size={14} className="text-amber-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{ws.title}</p>
                  <p className="text-xs text-gray-500">{ws.topic} · {ws.failedRecalls > 0 ? `${ws.failedRecalls} failed recall${ws.failedRecalls > 1 ? 's' : ''}` : ws.doubtCount > 0 ? `${ws.doubtCount} doubts asked` : 'Low exercise score'}</p>
                </div>
                <ChevronRight size={13} className="text-amber-400 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Referral */}
      {referralUrl && (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Referral program</h2>
          <p className="text-xs text-gray-500 mb-3">Invite friends — you both get 1 month Pro free when they complete their first module.</p>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <span className="flex-1 text-xs font-mono text-gray-700 truncate">{referralUrl}</span>
            <button onClick={() => { navigator.clipboard.writeText(referralUrl); toast.success('Copied!') }}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 flex-shrink-0">
              <Copy size={12} /> Copy
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
