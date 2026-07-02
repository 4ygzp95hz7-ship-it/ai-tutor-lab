'use client'

import { AiVideoPlayer } from './AiVideoPlayer'

interface Props {
  videoLabel: string
  videoStatus?: string
  videoUrl?: string
  onGenerateVideo: () => void
  generateLabel: string
  children: React.ReactNode
}

export function VideoTextPane({ videoLabel, videoStatus, videoUrl, onGenerateVideo, generateLabel, children }: Props) {
  return (
    <div className="flex-1 flex flex-col md:flex-row md:gap-8 md:overflow-hidden px-4 md:px-8 py-4 md:py-6 gap-6">
      <div className="md:w-[340px] md:flex-shrink-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{videoLabel}</p>
        <AiVideoPlayer status={videoStatus} videoUrl={videoUrl} onGenerate={onGenerateVideo} label={generateLabel} />
      </div>
      <div className="flex-1 min-w-0 md:overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
