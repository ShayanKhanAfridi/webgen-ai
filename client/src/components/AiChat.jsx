import { useState, useEffect, useRef } from 'react'
import { Sparkles, Trash2, Send, ChevronDown, ChevronUp, Copy, Check, Wand2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { supabase } from '../lib/supabase'
import api from '../lib/api'

// ─── Typing Indicator ────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 16px',
      borderRadius: 10,
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      maxWidth: 'fit-content',
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        width: 14,
        height: 14,
        borderRadius: '50%',
        border: '2.5px solid rgba(99,102,241,0.15)',
        borderTopColor: 'var(--primary)',
        animation: 'spin 0.8s linear infinite',
        flexShrink: 0
      }} />
      <span style={{
        fontSize: 11,
        color: 'var(--text-muted)',
        fontFamily: "'Fira Code', monospace",
        fontWeight: 600,
        letterSpacing: '-0.01em'
      }}>
        AI is writing and applying changes...
      </span>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// ─── Code Block ──────────────────────────────────────────────────────────────

function CodeBlock({ children, className }) {
  const [copied, setCopied] = useState(false)
  const code = String(children).trim()

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ position: 'relative', marginBottom: 8 }}>
      <button
        onClick={handleCopy}
        style={{
          position: 'absolute', top: 6, right: 6, background: 'rgba(255,255,255,0.1)',
          border: 'none', borderRadius: 4, padding: '2px 6px', cursor: 'pointer',
          color: '#aaa', fontSize: 10, display: 'flex', alignItems: 'center', gap: 3
        }}
      >
        {copied ? <Check size={10} /> : <Copy size={10} />}
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre style={{
        background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 6, padding: '10px 12px', overflowX: 'auto',
        fontSize: 11, lineHeight: 1.6, color: '#e5c07b', fontFamily: 'monospace', margin: 0
      }}>
        <code>{code}</code>
      </pre>
    </div>
  )
}

// ─── Message Bubble ──────────────────────────────────────────────────────────

function MessageBubble({ msg, onApplyChanges }) {
  const isUser = msg.role === 'user'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      gap: 4
    }}>
      <div style={{
        maxWidth: '85%', padding: '9px 13px', fontSize: 13, lineHeight: 1.5,
        borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
        background: isUser ? 'rgba(99,102,241,0.18)' : 'var(--surface-2)',
        border: `1px solid ${isUser ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
        color: 'var(--text)'
      }}>
        {isUser ? (
          <span>{msg.content}</span>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }) {
                if (inline) {
                  return (
                    <code style={{
                      background: 'rgba(99,102,241,0.15)', padding: '1px 5px',
                      borderRadius: 4, fontSize: 11, fontFamily: 'monospace'
                    }} {...props}>{children}</code>
                  )
                }
                return <CodeBlock className={className}>{children}</CodeBlock>
              },
              p({ children }) { return <p style={{ margin: '0 0 6px' }}>{children}</p> },
              ul({ children }) { return <ul style={{ margin: '4px 0', paddingLeft: 16 }}>{children}</ul> },
              ol({ children }) { return <ol style={{ margin: '4px 0', paddingLeft: 16 }}>{children}</ol> },
              li({ children }) { return <li style={{ marginBottom: 2 }}>{children}</li> },
              strong({ children }) { return <strong style={{ color: '#c4b5fd' }}>{children}</strong> },
            }}
          >
            {msg.content}
          </ReactMarkdown>
        )}
      </div>

      {/* Apply Changes button for AI messages with file updates */}
      {!isUser && msg.updatedFiles && Object.keys(msg.updatedFiles).length > 0 && onApplyChanges && (
        <button
          onClick={() => onApplyChanges(msg.updatedFiles)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
            background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600,
            color: 'var(--primary)'
          }}
        >
          <Wand2 size={11} />
          Apply Changes ({Object.keys(msg.updatedFiles).length} files)
        </button>
      )}
    </div>
  )
}

// ─── AiChat ──────────────────────────────────────────────────────────────────

export default function AiChat({ projectId, project, files, stack, onApplyChanges, open, onToggle, mode }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState(null)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  // Load user + history
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)

      if (!projectId) return
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })

      if (data) {
        setMessages(data.map(m => ({ role: m.role, content: m.content, id: m.id })))
      }
    }
    init()
  }, [projectId])

  // Auto scroll
  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [messages, open, loading])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const content = input.trim()
    setInput('')
    setLoading(true)

    const userMsg = { role: 'user', content, id: `local-${Date.now()}` }
    setMessages(prev => [...prev, userMsg])

    try {
      const { data } = await api.post('/ai/modify', {
        message: content,
        projectId,
        files,
        stack: stack || project?.stack || 'html',
        chatHistory: messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
      })

      const reply = data.reply || 'Done! Check the changes in your editor.'
      const updatedFiles = data.updatedFiles || null

      const aiMsg = { role: 'assistant', content: reply, updatedFiles, id: `ai-${Date.now()}` }
      setMessages(prev => [...prev, aiMsg])

      if (updatedFiles && Object.keys(updatedFiles).length > 0 && onApplyChanges) {
        onApplyChanges(updatedFiles)
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}`, id: `err-${Date.now()}` }])
    } finally {
      setLoading(false)
    }
  }


  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClear = async () => {
    setMessages([])
    if (projectId) {
      await supabase.from('chat_messages').delete().eq('project_id', projectId).catch(() => {})
    }
  }

  return (
    <div style={{
      background: 'var(--surface)', borderTop: mode === 'panel' ? 'none' : '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      height: mode === 'panel' ? '100%' : (open ? 280 : 44), transition: 'height 0.2s ease',
      overflow: 'hidden', flexShrink: 0
    }}>
      {/* Header */}
      {mode !== 'panel' && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 14px', height: 44, flexShrink: 0, cursor: 'pointer',
          borderBottom: open ? '1px solid var(--border)' : 'none'
        }} onClick={onToggle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={14} color="var(--primary)" />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>AI Assistant</span>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99,
              background: 'rgba(99,102,241,0.15)', color: 'var(--primary)', letterSpacing: '0.05em'
            }}>GEMINI</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
            {open && (
              <button
                onClick={handleClear}
                title="Clear chat"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex' }}
                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <Trash2 size={13} />
              </button>
            )}
            <button
              onClick={onToggle}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, display: 'flex' }}
            >
              {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      {(open || mode === 'panel') && (
        <>
          <div style={{
            flex: 1, overflowY: 'auto', padding: '10px 12px',
            display: 'flex', flexDirection: 'column', gap: 8
          }}>
            {messages.length === 0 && !loading && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginTop: 12 }}>
                <Sparkles size={20} style={{ opacity: 0.4, marginBottom: 6 }} />
                <p>Ask AI to modify your project</p>
                <p style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>Changes are applied instantly</p>
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} onApplyChanges={onApplyChanges} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '8px 12px', display: 'flex', gap: 8,
            borderTop: '1px solid var(--border)', flexShrink: 0
          }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI to modify your project… (Enter to send, Shift+Enter for newline)"
              disabled={loading}
              rows={1}
              style={{
                flex: 1, background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '7px 11px', fontSize: 12, color: 'var(--text)',
                outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5,
                opacity: loading ? 0.6 : 1,
                maxHeight: 80, overflowY: 'auto'
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              style={{
                width: 34, height: 34, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: input.trim() && !loading ? 1 : 0.4, flexShrink: 0
              }}
            >
              <Send size={13} color="#fff" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
