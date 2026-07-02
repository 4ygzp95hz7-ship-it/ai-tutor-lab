'use client'

import { useState } from 'react'
import { Link2, CheckCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false)

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).catch(() => {})
    setCopied(true)
    toast.success('Link copied')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button onClick={copyLink}
      className={cn('flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors',
        copied ? 'text-green-700 bg-green-50 border-green-100' : 'text-gray-600 bg-gray-50 border-gray-100 hover:bg-gray-100')}>
      {copied ? <CheckCheck size={11} /> : <Link2 size={11} />}
      {copied ? 'Copied' : 'Copy link'}
    </button>
  )
}
