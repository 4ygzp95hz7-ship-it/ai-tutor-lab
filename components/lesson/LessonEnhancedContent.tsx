'use client'

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Play, ExternalLink, Code2, AlertCircle } from 'lucide-react'

// Extract YouTube video ID from any YouTube URL
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/results\?search_query=(.+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

// Check if URL is a YouTube search query
function isYouTubeSearch(url: string): boolean {
  return url.includes('youtube.com/results?search_query=')
}

// Mermaid diagram component
function MermaidDiagram({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState(false)
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    if (!ref.current || rendered) return
    import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' })
      const id = `mermaid-${Math.random().toString(36).slice(2)}`
      mermaid.render(id, code)
        .then(({ svg }) => {
          if (ref.current) { ref.current.innerHTML = svg; setRendered(true) }
        })
        .catch(() => setError(true))
    }).catch(() => setError(true))
  }, [code, rendered])

  if (error) return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-500 flex items-center gap-2">
      <AlertCircle size={13} /> Diagram could not render
    </div>
  )

  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 overflow-x-auto my-4">
      <div ref={ref} className="flex justify-center" />
    </div>
  )
}

// YouTube embed component
function YouTubeEmbed({ videoId, title }: { videoId: string; title?: string }) {
  const [error, setError] = useState(false)
  const [playing, setPlaying] = useState(false)

  if (error) {
    return (
      <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 hover:bg-red-100 transition-colors">
        <ExternalLink size={13} /> Watch on YouTube: {title}
      </a>
    )
  }

  if (!playing) {
    return (
      <div className="relative bg-gray-900 rounded-xl overflow-hidden my-4 cursor-pointer group"
        style={{ aspectRatio: '16/9', maxHeight: '320px' }}
        onClick={() => setPlaying(true)}>
        <img src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
          alt={title ?? 'Video'}
          className="w-full h-full object-cover opacity-80 group-hover:opacity-90 transition-opacity"
          onError={e => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
            <Play size={24} className="text-white ml-1" fill="white" />
          </div>
        </div>
        {title && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3">
            <p className="text-white text-sm font-medium line-clamp-1">{title}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative rounded-xl overflow-hidden my-4" style={{ aspectRatio: '16/9', maxHeight: '320px' }}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        onError={() => setError(true)}
      />
    </div>
  )
}

// YouTube search button
function YouTubeSearchButton({ query, title }: { query: string; title?: string }) {
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
  return (
    <a href={searchUrl} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 hover:bg-red-100 transition-colors">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="#E24B4A"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>
      Search YouTube: {title ?? query}
    </a>
  )
}

// Live code playground button
function PlaygroundButton({ code, language }: { code: string; language: string }) {
  function openPlayground() {
    const lang = language.toLowerCase()
    if (lang === 'python') {
      const encoded = encodeURIComponent(code)
      window.open(`https://repl.it/languages/python3?code=${encoded}`, '_blank')
    } else {
      // StackBlitz for JS/TS
      const files = {
        'index.js': code,
        'package.json': JSON.stringify({ name: 'playground', type: 'module' }, null, 2)
      }
      const data = { files, template: 'node' }
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = 'https://stackblitz.com/run?file=index.js'
      form.target = '_blank'
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = 'project[files][index.js]'
      input.value = code
      form.appendChild(input)
      document.body.appendChild(form)
      form.submit()
      document.body.removeChild(form)
    }
  }

  return (
    <button onClick={openPlayground}
      className="inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-md hover:bg-green-100 transition-colors font-medium ml-auto">
      <Code2 size={12} />
      Run in playground
    </button>
  )
}

// Extract plain text from React children (handles string and nested nodes)
function extractText(children: React.ReactNode): string {
  if (typeof children === 'string') return children
  if (typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(extractText).join('')
  if (children && typeof children === 'object' && 'props' in (children as React.ReactElement)) {
    const el = children as React.ReactElement<{ children?: React.ReactNode }>
    return extractText(el.props.children)
  }
  return ''
}

// Custom code block that adds playground button
function CodeBlock({ children, className }: { children?: React.ReactNode; className?: string }) {
  const language = className?.replace('language-', '') ?? 'text'
  const code = extractText(children).trim()

  if (language === 'mermaid') {
    return <MermaidDiagram code={code} />
  }

  const playgroundLangs = ['javascript', 'js', 'typescript', 'ts', 'python', 'py', 'sql']
  const showPlayground = playgroundLangs.includes(language) && code.length > 10

  return (
    // not-prose escapes Tailwind Typography's prose styles completely
    <div className="not-prose my-4 rounded-xl overflow-hidden border border-gray-700">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1e293b', padding: '8px 16px' }}>
        <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{language}</span>
        {showPlayground && <PlaygroundButton code={code} language={language} />}
      </div>
      <pre style={{ margin: 0, padding: '16px', background: '#0f172a', overflowX: 'auto' }}>
        <code style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: '1.7', fontFamily: 'ui-monospace, SFMono-Regular, monospace', whiteSpace: 'pre' }}>
          {code}
        </code>
      </pre>
    </div>
  )
}

// Enhanced markdown renderer with all enrichments
interface Props {
  content: string
  resources?: { title: string; url: string; type: string }[]
  subModuleTitle?: string
  topic?: string
}

export function LessonEnhancedContent({ content, resources, subModuleTitle, topic }: Props) {
  const videoResources = (resources ?? []).filter(r => r.type === 'video')

  return (
    <div>
      {/* Video resources section */}
      {videoResources.length > 0 && (
        <div className="mb-5 pb-5 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Video resources
          </p>
          <div className="space-y-3">
            {videoResources.map((v, i) => {
              const ytId = extractYouTubeId(v.url)
              const isSearch = isYouTubeSearch(v.url)
              if (isSearch) {
                const q = decodeURIComponent(v.url.split('search_query=')[1] ?? subModuleTitle ?? topic ?? '')
                return <YouTubeSearchButton key={i} query={q} title={v.title} />
              }
              if (ytId) return <YouTubeEmbed key={i} videoId={ytId} title={v.title} />
              return (
                <a key={i} href={v.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                  <ExternalLink size={12} />{v.title}
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* Fallback YouTube search if no video resources */}
      {videoResources.length === 0 && subModuleTitle && (
        <div className="mb-4">
          <YouTubeSearchButton query={`${topic ?? ''} ${subModuleTitle}`} title={subModuleTitle} />
        </div>
      )}

      {/* Main lesson content with enhanced code blocks */}
      <div className="prose prose-sm max-w-none
        prose-headings:font-semibold prose-headings:text-gray-900
        prose-p:text-gray-700 prose-p:leading-relaxed
        prose-strong:text-gray-900
        prose-ul:text-gray-700 prose-li:my-1 prose-li:leading-relaxed
        prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ className, children, ...props }) {
              const isBlock = className?.startsWith('language-')
              if (!isBlock) {
                return <code className="bg-gray-100 text-blue-700 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>
              }
              return <CodeBlock className={className}>{children}</CodeBlock>
            },
            pre({ children }) {
              // Let the code component handle the rendering — pre is just a passthrough
              return <div className="not-prose">{children}</div>
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}
