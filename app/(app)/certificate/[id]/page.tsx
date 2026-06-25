'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, Share2, Award, CheckCircle, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'

interface Certificate {
  recipientName: string; topic: string; roadmapTitle: string
  completedModules: number; totalModules: number; completionPct: number; issuedDate: string
}

export default function CertificatePage() {
  const params = useParams()
  const [cert, setCert] = useState<Certificate | null>(null)
  const [eligible, setEligible] = useState<boolean | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch(`/api/certificate/${params.id}`)
      .then(r => r.json())
      .then(data => {
        setEligible(data.eligible)
        if (data.eligible) setCert(data.certificate)
        else setMessage(data.message ?? '')
      })
  }, [params.id])

  if (eligible === null) return <div className="flex h-full items-center justify-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>

  if (!eligible) return (
    <div className="max-w-lg mx-auto p-8 text-center">
      <Award size={48} className="mx-auto text-gray-200 mb-4" />
      <h2 className="text-xl font-bold text-gray-900 mb-2">Certificate not yet available</h2>
      <p className="text-gray-500 text-sm mb-6">{message}</p>
      <Link href="/roadmap" className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
        Continue learning →
      </Link>
    </div>
  )

  if (!cert) return null

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/roadmap" className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><ArrowLeft size={18} className="text-gray-500" /></Link>
        <h1 className="text-xl font-bold text-gray-900">Your Certificate</h1>
      </div>

      {/* Certificate card */}
      <div id="cert-card" className="bg-white border-2 border-amber-200 rounded-2xl overflow-hidden shadow-lg mb-6">
        {/* Header band */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-10 py-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <BookOpen size={16} className="text-white" />
            </div>
            <span className="text-white font-semibold">AI Tutor Lab</span>
          </div>
          <p className="text-blue-200 text-sm font-medium uppercase tracking-widest">Certificate of Completion</p>
        </div>

        {/* Body */}
        <div className="px-12 py-10 text-center">
          <p className="text-gray-500 text-sm mb-2">This certifies that</p>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{cert.recipientName}</h2>
          <p className="text-gray-500 text-sm mb-6">has successfully completed</p>

          <div className="bg-amber-50 border border-amber-100 rounded-xl px-8 py-5 inline-block mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-1">{cert.roadmapTitle}</h3>
            <p className="text-sm text-gray-500">{cert.topic} · AI-powered personalized curriculum</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div>
              <div className="text-2xl font-bold text-blue-600">{cert.completedModules}</div>
              <div className="text-xs text-gray-400 mt-0.5">Modules completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{cert.completionPct}%</div>
              <div className="text-xs text-gray-400 mt-0.5">Curriculum covered</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">AI-verified</div>
              <div className="text-xs text-gray-400 mt-0.5">Recall tested</div>
            </div>
          </div>

          <p className="text-xs text-gray-400">Issued on {cert.issuedDate}</p>
        </div>

        {/* Footer */}
        <div className="px-12 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <CheckCircle size={13} className="text-green-500" />
            Verified by AI Tutor Lab · Recall quizzes passed
          </div>
          <Award size={20} className="text-amber-400" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-center">
        <button onClick={() => { window.print(); }} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
          <Download size={15} /> Download / Print
        </button>
        <button onClick={() => {
          navigator.clipboard.writeText(window.location.href)
          toast.success('Link copied!')
        }} className="flex items-center gap-2 border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
          <Share2 size={15} /> Share link
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">Share this page to showcase your achievement on LinkedIn or in job applications.</p>
    </div>
  )
}
