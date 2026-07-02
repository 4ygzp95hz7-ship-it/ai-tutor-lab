'use client'

import { Loader2, Video as VideoIcon, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  videoUrl?: string
  status?: string // '' | 'pending' | 'processing' | 'completed' | 'failed'
  onGenerate: () => void
  label?: string
}

export function AiVideoPlayer({ videoUrl, status, onGenerate, label = 'Video summary' }: Props) {
  if (status === 'completed' && videoUrl) {
    return (
      <div className="my-4">
        <video src={videoUrl} controls className="w-full rounded-xl border border-gray-200 bg-black" style={{ maxHeight: 420 }} />
      </div>
    )
  }

  const isBusy = status === 'pending' || status === 'processing'
  const failed = status === 'failed'

  return (
    <button onClick={onGenerate} disabled={isBusy}
      className={cn('flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors',
        isBusy ? 'text-gray-400 bg-gray-50 border-gray-100 cursor-wait' :
        failed ? 'text-red-700 bg-red-50 border-red-100 hover:bg-red-100' :
        'text-emerald-700 bg-emerald-50 border-emerald-100 hover:bg-emerald-100')}>
      {isBusy ? <Loader2 size={11} className="animate-spin" /> : failed ? <RotateCcw size={11} /> : <VideoIcon size={11} />}
      {isBusy ? 'Generating video…' : failed ? 'Retry video' : label}
    </button>
  )
}
