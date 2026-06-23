'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, ThumbsUp, ThumbsDown, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
  rating?: number
}

interface ChatPanelProps {
  open: boolean
  onClose: () => void
  stageId?: string
  sessionId?: string
}

export function ChatPanel({ open, onClose, stageId, sessionId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm your AI tutor. Ask me anything about the topic you're studying — I know exactly where you are in your learning journey." }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendMessage() {
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    const placeholder = { role: 'assistant' as const, content: '', id: undefined }
    setMessages(prev => [...prev, placeholder])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, stageId, sessionId: sessionId ?? 'default' }),
      })

      if (!res.ok) {
        const err = await res.json()
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: `⚠️ ${err.error}` }
          return updated
        })
        setLoading(false)
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const { token } = JSON.parse(line.slice(6))
              accumulated += token
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: accumulated }
                return updated
              })
            } catch {}
          }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: '⚠️ Something went wrong. Please try again.' }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  async function submitFeedback(messageId: string | undefined, rating: number, index: number) {
    if (!messageId) return
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, rating, feature: 'doubt' }),
    })
    setMessages(prev => prev.map((m, i) => i === index ? { ...m, rating } : m))
  }

  if (!open) return null

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-xl border-l border-gray-100 flex flex-col z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-blue-600" />
          <div>
            <p className="text-sm font-semibold text-gray-900">AI Doubt Assistant</p>
            <p className="text-xs text-gray-400">Always in context</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i}>
            <div className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[85%] text-xs rounded-xl px-3 py-2 leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                )}
                style={{ whiteSpace: 'pre-wrap' }}
              >
                {msg.content || (loading && i === messages.length - 1 ? '…' : '')}
              </div>
            </div>
            {msg.role === 'assistant' && msg.content && (
              <div className="flex gap-1 mt-1 ml-1">
                <button
                  onClick={() => submitFeedback(msg.id, 1, i)}
                  className={cn('p-1 rounded transition-colors', msg.rating === 1 ? 'text-green-600' : 'text-gray-300 hover:text-green-500')}
                >
                  <ThumbsUp size={12} />
                </button>
                <button
                  onClick={() => submitFeedback(msg.id, -1, i)}
                  className={cn('p-1 rounded transition-colors', msg.rating === -1 ? 'text-red-500' : 'text-gray-300 hover:text-red-400')}
                >
                  <ThumbsDown size={12} />
                </button>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-gray-100">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Ask your doubt…"
            rows={2}
            className="flex-1 resize-none text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 placeholder-gray-400"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="self-end p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
