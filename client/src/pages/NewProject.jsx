import { useState, useRef, useEffect, Component } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown, Loader2, Send, CheckCircle2, Sparkles,
  Settings2, ExternalLink, Terminal, Code2, Play, Eye,
  Plus, History, MessageSquare, Copy, Check, X, Globe, Server
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { supabase } from '../lib/supabase'

// projectTypes removed as Project Type is no longer requested
const themes = ['Modern Dark', 'Minimal Light', 'Bold Creative', 'Elegant', 'Playful', 'Corporate', 'Futuristic']
const colorSchemes = [
  { name: 'Indigo', color: '#6366f1' },
  { name: 'Purple', color: '#a855f7' },
  { name: 'Cyan', color: '#06b6d4' },
  { name: 'Green', color: '#22c55e' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Rose', color: '#f43f5e' },
]
// pageOptions removed — pages are determined automatically by the AI plan
const steps = [
  'Analyzing website layout requirements...',
  'Structuring database schema & multi-page architecture...',
  'Generating responsive semantic HTML structure...',
  'Compiling custom design system and stylesheet variables...',
  'Injecting interactive client-side JavaScript controllers...',
  'Finalizing project bundle and deploying to cloud preview...'
]

const inpStyle = {
  width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '12px 16px', fontSize: 14, color: 'var(--text)',
  outline: 'none', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('NewProject crashed:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 40, color: '#ef4444', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)',
          background: 'var(--bg)', gap: 16
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Something went wrong</h2>
          <pre style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 8, padding: 16, fontSize: 12, color: 'var(--text)',
            maxWidth: 600, overflowX: 'auto', whiteSpace: 'pre-wrap'
          }}>{this.state.error?.message}</pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '8px 20px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              color: '#fff', fontSize: 13, fontWeight: 600
            }}
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function NewProjectInner() {
  const navigate = useNavigate()
  const { setIsSidebarCollapsed } = useOutletContext() || {}
  const [phase, setPhase] = useState('input')
  const [prompt, setPrompt] = useState('')
  const [projectTitle, setProjectTitle] = useState('')
  const [showOptions, setShowOptions] = useState(false)
  // websiteType state removed
  const [theme, setTheme] = useState('Modern Dark')
  const [colorScheme, setColorScheme] = useState('Indigo')
  const [generationError, setGenerationError] = useState(null)
  const [stack, setStack] = useState('html')
  const [generating, setGenerating] = useState(false)
  const [plan, setPlan] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [logs, setLogs] = useState([])
  const [files, setFiles] = useState({})
  const [previewHtml, setPreviewHtml] = useState('')
  
  // Left Panel Tabs & Chat states
  const [leftTab, setLeftTab] = useState('terminal') // 'terminal' | 'chat'
  const [chatMsg, setChatMsg] = useState('')
  const [chats, setChats] = useState([
    { id: 'initial', title: 'Initial Design Plan', history: [] }
  ])
  const [activeChatId, setActiveChatId] = useState('initial')
  const [showHistoryTray, setShowHistoryTray] = useState(false)
  
  // Right Panel Tabs states
  const [rightView, setRightView] = useState('preview') // 'preview' | 'code'
  const [pageTabs, setPageTabs] = useState([])
  const [activeTab, setActiveTab] = useState(0)
  const [copied, setCopied] = useState(false)
  
  const [projectId, setProjectId] = useState(null)
  
  const done = currentStep >= 6

  const getProgressPercentage = () => {
    if (currentStep === 0) return 0
    if (currentStep === 1) return 10
    if (currentStep === 2) return 20
    if (currentStep >= 6) return 100
    const totalExpectedFiles = stack === 'html' ? 1 : (stack === 'fullstack' ? 11 : 8)
    const generatedCount = Object.keys(files).length
    const fileProgress = Math.min(1, generatedCount / totalExpectedFiles)
    return Math.round(30 + fileProgress * 65)
  }

  // Refs to prevent stale closure bugs in EventSource stream callbacks
  const filesRef = useRef({})
  const pageTabsRef = useRef([])
  const activeTabRef = useRef(0)
  const previewHtmlRef = useRef('')

  useEffect(() => { filesRef.current = files }, [files])
  useEffect(() => { pageTabsRef.current = pageTabs }, [pageTabs])
  useEffect(() => { activeTabRef.current = activeTab }, [activeTab])
  useEffect(() => { previewHtmlRef.current = previewHtml }, [previewHtml])

  const iframeRef = useRef(null)
  const consoleEndRef = useRef(null)
  const chatEndRef = useRef(null)


  // Automatically collapse sidebar on mount if already generating
  useEffect(() => {
    if (phase === 'generating' && setIsSidebarCollapsed) {
      setIsSidebarCollapsed(true)
    }
  }, [phase, setIsSidebarCollapsed])

  // Scroll logs/chat automatically
  useEffect(() => {
    if (leftTab === 'terminal' && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, leftTab])

  useEffect(() => {
    if (leftTab === 'chat' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chats, activeChatId, leftTab])

  const addLog = (text, type = 'info') => {
    const time = new Date().toLocaleTimeString().split(' ')[0]
    setLogs(prev => [...prev, { time, text, type }])
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) { toast.error('Please describe your website'); return }
    setGenerating(true)
    setGenerationError(null)
    setPhase('generating')
    
    // Programmatically collapse the sidebar
    if (setIsSidebarCollapsed) {
      setIsSidebarCollapsed(true)
    }

    addLog('Initializing system generation core...', 'system')

    try {
      addLog('Contacting model for website planning...', 'info')
      const { data } = await api.post('/ai/plan', {
        prompt: `${prompt}. Theme:${theme}. Color:${colorScheme}. Stack:${stack}.`
      })
      const planData = data.plan
      setPlan(planData)
      setPageTabs(planData.pages || [])
      setCurrentStep(1)
      addLog(`Plan created: Theme [${planData.theme}], Color [${planData.colorScheme}]`, 'success')
      addLog(`Pages to construct: ${planData.pages?.join(', ')}`, 'info')

      await new Promise(r => setTimeout(r, 600))
      setCurrentStep(2)
      addLog('Retrieving active user authentication context...', 'info')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const title = projectTitle.trim() || prompt.slice(0, 40)
      addLog(`Saving project configuration "${title}" to database...`, 'info')

      const { data: proj, error: projErr } = await supabase.from('projects').insert({
        user_id: user.id, title, prompt, stack,
        theme: planData.theme,
        color_scheme: planData.colorScheme, pages: planData.pages || [], plan: planData
      }).select().single()

      if (projErr) throw projErr
      setProjectId(proj.id)
      setCurrentStep(3)
      addLog(`Database entry committed successfully. Assigned project ID: ${proj.id}`, 'success')

      // Connect via fetch() POST stream instead of EventSource GET to avoid URL length limits
      addLog('Opening compiler channel for real-time asset generation stream...', 'info')
      
      const { data: { session } } = await supabase.auth.getSession()

      const genResponse = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          prompt,
          theme,
          colorScheme,
          stack,
          projectId: proj.id,
          userId: user.id
        })
      })

      if (!genResponse.ok) {
        const errText = await genResponse.text()
        throw new Error(`Generation stream failed (${genResponse.status}): ${errText}`)
      }

      const reader = genResponse.body.getReader()
      const decoder = new TextDecoder()
      let sseBuffer = ''
      let isDone = false

      while (!isDone) {
        const { done, value } = await reader.read()
        if (done) break

        sseBuffer += decoder.decode(value, { stream: true })

        // SSE data chunks are separated by double newlines
        const chunks = sseBuffer.split('\n\n')
        // Keep the last (potentially incomplete) chunk in the buffer
        sseBuffer = chunks.pop() || ''

        for (const chunk of chunks) {
          const lines = chunk.trim().split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const eventObj = JSON.parse(line.slice(6))
                
                if (eventObj.type === 'progress') {
                  addLog(eventObj.step, 'info')
                } else if (eventObj.type === 'warning') {
                  addLog(eventObj.message, 'warning')
                } else if (eventObj.type === 'error') {
                  throw new Error(eventObj.message)
                } else if (eventObj.type === 'file') {
                  const { filename, content } = eventObj
                  if (filename && content !== undefined) {
                    // Read refs synchronously BEFORE any setState calls
                    const currentTabs = pageTabsRef.current
                    const currentActiveTab = activeTabRef.current
                    const currentPreviewHtml = previewHtmlRef.current
                    const filenameOfActiveTab = currentTabs[currentActiveTab]?.toLowerCase() === 'home'
                      ? 'index.html'
                      : `${currentTabs[currentActiveTab]?.toLowerCase()}.html`
                    const shouldUpdatePreview =
                      filename === filenameOfActiveTab ||
                      (!currentPreviewHtml && filename.endsWith('.html'))

                    setFiles(prev => ({ ...prev, [filename]: content }))
                    if (shouldUpdatePreview) {
                      setPreviewHtml(content)
                    }
                    addLog(`Generated: [${filename}] (${content.length} bytes)`, 'success')
                  }
                } else if (eventObj.type === 'done') {
                  isDone = true
                  break
                }
              } catch (e) {
                if (e instanceof SyntaxError) {
                  // Ignore JSON parse errors for incomplete chunks
                } else {
                  throw e
                }
              }
            }
          }
        }
      }

      // Generation complete
      setCurrentStep(6)
      addLog('WebGen compiler successfully output all files.', 'system')
      addLog('Workspace deployment complete! App is ready for interaction.', 'system')
      toast.success('Website generated! 🎉')
      
      setTimeout(() => {
        navigate(`/project/${proj.id}`)
      }, 1500)

    } catch (err) {
      addLog(`Critical error during build: ${err.message}`, 'error')
      console.error('Generation error:', err)
      toast.error(err.message || 'Generation failed')
      setGenerationError(err.message || 'Generation failed. Please try again.')
      setGenerating(false)
    }
  }

  // Handle Chat Input & Modifies
  const handleSendChat = async () => {
    if (!chatMsg.trim()) return
    const msg = chatMsg
    setChatMsg('')

    // Append to active chat thread history
    setChats(prev => prev.map(c => {
      if (c.id === activeChatId) {
        return { ...c, history: [...c.history, { role: 'user', content: msg }] }
      }
      return c
    }))

    addLog(`AI Modification prompt submitted: "${msg}"`, 'info')

    try {
      const { data } = await api.post('/ai/modify', { files, message: msg, plan })
      if (data.updatedFiles) {
        setFiles(p => ({ ...p, ...data.updatedFiles }))
        
        const activeFilename = pageTabs[activeTab]?.toLowerCase() === 'home' ? 'index.html' : `${pageTabs[activeTab]?.toLowerCase()}.html`
        if (data.updatedFiles[activeFilename]) {
          setPreviewHtml(data.updatedFiles[activeFilename])
        } else {
          const html = Object.entries(data.updatedFiles).find(([k]) => k.endsWith('.html'))
          if (html) setPreviewHtml(html[1])
        }

        Object.keys(data.updatedFiles).forEach(filename => {
          addLog(`Modified workspace asset: [${filename}]`, 'success')
        })

        setChats(prev => prev.map(c => {
          if (c.id === activeChatId) {
            return {
              ...c,
              history: [...c.history, { role: 'ai', content: 'I have updated the files based on your request. Check the preview pane.' }]
            }
          }
          return c
        }))
      }
    } catch (err) {
      addLog(`Failed to process modification: ${err.message}`, 'error')
      setChats(prev => prev.map(c => {
        if (c.id === activeChatId) {
          return {
            ...c,
            history: [...c.history, { role: 'ai', content: 'Could not process that request. Please try again.' }]
          }
        }
        return c
      }))
    }
  }

  // Starts a new chat thread
  const handleNewChat = () => {
    const newId = `chat_${Date.now()}`
    const newTitle = `Thread #${chats.length + 1}`
    setChats(prev => [
      ...prev,
      { id: newId, title: newTitle, history: [] }
    ])
    setActiveChatId(newId)
    toast.success('Started a new conversation thread')
  }

  const activeChat = chats.find(c => c.id === activeChatId) || chats[0]

  useEffect(() => {
    if (Object.keys(files).length > 0 && projectId) {
      ;(async () => {
        await supabase.from('projects').update({ generated_files: files }).eq('id', projectId)
      })().catch(() => {})
    }
  }, [files, projectId])

  useEffect(() => {
    if (iframeRef.current && previewHtml) {
      const blob = new Blob([previewHtml], { type: 'text/html' })
      iframeRef.current.src = URL.createObjectURL(blob)
    }
  }, [previewHtml])

  const getTabs = () => {
    const fileNames = Object.keys(files)
    if (fileNames.length === 0) {
      if (stack === 'html') {
        return [{ label: 'index.html', filename: 'index.html' }]
      } else {
        return [{ label: 'App.tsx', filename: 'src/App.tsx' }]
      }
    }
    const ordered = []
    if (stack === 'html') {
      const order = ['index.html']
      order.forEach(f => {
        if (fileNames.includes(f)) ordered.push(f)
      })
      fileNames.forEach(f => {
        if (!order.includes(f)) ordered.push(f)
      })
    } else {
      const order = ['src/App.tsx', 'src/App.css', 'index.html', 'package.json', 'vite.config.ts', 'tsconfig.json']
      order.forEach(f => {
        if (fileNames.includes(f)) ordered.push(f)
      })
      fileNames.forEach(f => {
        if (!order.includes(f) && f !== 'README.md') ordered.push(f)
      })
      if (fileNames.includes('README.md')) ordered.push('README.md')
    }
    return ordered.map(f => ({
      label: f,
      filename: f
    }))
  }

  const tabsToShow = getTabs()
  const safeActiveTab = Math.min(activeTab, Math.max(0, tabsToShow.length - 1))
  const activeFilename = tabsToShow[safeActiveTab]?.filename || ''
  const activeCodeContent = files[activeFilename] || ''

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeCodeContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Code copied to clipboard')
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {phase === 'input' ? (
        /* Setup Interface */
        <motion.div
          key="input"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: 'calc(100vh - 64px)', padding: '40px 24px',
            background: 'var(--bg)'
          }}
        >
          <div style={{ width: '100%', maxWidth: 720 }}>
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <h1 style={{
                fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em',
                background: 'linear-gradient(135deg, #fff 30%, var(--text-muted) 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                marginBottom: 12
              }}>
                What do you want to build?
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>
                Prompt, generate, and deploy full stack web apps locally.
              </p>
            </div>

            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 18, boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
              marginBottom: 16
            }}>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value.slice(0, 500))}
                placeholder="e.g. Build a full-stack task management app with React, drag-and-drop boards, and a Node.js backend..."
                rows={4}
                style={{
                  width: '100%', background: 'transparent', border: 'none',
                  resize: 'none', fontSize: 15, color: 'var(--text)',
                  outline: 'none', fontFamily: 'inherit', lineHeight: 1.6
                }}
              />
              
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingTop: 12, borderTop: '1px solid var(--border)', marginTop: 12
              }}>
                <button
                  onClick={() => setShowOptions(s => !s)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-2)',
                    border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px',
                    cursor: 'pointer', color: 'var(--text)', fontSize: 12, fontWeight: 500
                  }}
                >
                  <Settings2 size={13} />
                  Configure Options
                  <ChevronDown size={12} style={{ transform: showOptions ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{prompt.length}/500</span>
                  <motion.button
                    onClick={handleGenerate}
                    disabled={generating || !prompt.trim()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 16px', borderRadius: 6, border: 'none',
                      background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                      color: '#fff', fontSize: 13, fontWeight: 600,
                      cursor: prompt.trim() ? 'pointer' : 'not-allowed', opacity: prompt.trim() ? 1 : 0.6
                    }}
                  >
                    <Sparkles size={14} />
                    Generate
                  </motion.button>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {showOptions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: 'hidden', marginBottom: 20 }}
                >
                  <div style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: 20, display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)', gap: 16
                  }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Project Name</label>
                      <input
                        value={projectTitle}
                        onChange={e => setProjectTitle(e.target.value)}
                        placeholder="my-awesome-repl"
                        style={inpStyle}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Theme</label>
                      <select value={theme} onChange={e => setTheme(e.target.value)} style={inpStyle}>
                        {themes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Color Scheme</label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', height: 42 }}>
                        {colorSchemes.map(cs => (
                          <button
                            key={cs.name}
                            onClick={() => setColorScheme(cs.name)}
                            title={cs.name}
                            style={{
                              width: 24, height: 24, borderRadius: '50%', background: cs.color,
                              border: colorScheme === cs.name ? '2px solid #fff' : '2px solid transparent',
                              outline: colorScheme === cs.name ? `1.5px solid ${cs.color}` : 'none',
                              cursor: 'pointer', padding: 0, transition: 'all 0.15s'
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Tech Stack Selector */}
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>Tech Stack</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                        {[
                          { id: 'html', label: 'HTML + CSS + JS', description: 'Simple static website', Icon: Globe, color: '#f97316' },
                          { id: 'react', label: 'React + TypeScript', description: 'Modern frontend app', Icon: Code2, color: '#06b6d4' },
                          { id: 'fullstack', label: 'React + Node.js', description: 'Full stack application', Icon: Server, color: '#6366f1' },
                        ].map(({ id: sid, label, description, Icon, color }) => {
                          const selected = stack === sid
                          return (
                            <button
                              key={sid}
                              onClick={() => setStack(sid)}
                              style={{
                                padding: 14, borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                                background: selected ? 'rgba(99,102,241,0.1)' : 'var(--surface-2)',
                                border: selected ? '1px solid var(--primary)' : '1px solid var(--border)',
                                transition: 'all 0.15s'
                              }}
                            >
                              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                                <Icon size={16} color={color} />
                              </div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: selected ? 'var(--primary)' : 'var(--text)', marginBottom: 3 }}>{label}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{description}</div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      ) : (
        /* Workspace Panel */
        <motion.div
          key="split"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' }}
        >
          {/* Left Panel: Build Terminal & Multi-Thread AI Developer Chat */}
          <div style={{
            width: '420px', minWidth: '360px', background: 'var(--surface)',
            borderRight: '1px solid var(--border)', display: 'flex',
            flexDirection: 'column', overflow: 'hidden', position: 'relative'
          }}>
            {/* Left Header Tabs (Terminal vs AI Chat) */}
            <div style={{
              display: 'flex', background: 'var(--surface-2)',
              borderBottom: '1px solid var(--border)', padding: '0 8px', height: 48,
              alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => setLeftTab('terminal')}
                  style={{
                    padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', border: 'none',
                    background: leftTab === 'terminal' ? 'var(--surface)' : 'transparent',
                    color: leftTab === 'terminal' ? 'var(--primary)' : 'var(--text-muted)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Terminal size={14} />
                    Terminal
                  </div>
                </button>
                <button
                  onClick={() => setLeftTab('chat')}
                  style={{
                    padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', border: 'none',
                    background: leftTab === 'chat' ? 'var(--surface)' : 'transparent',
                    color: leftTab === 'chat' ? 'var(--primary)' : 'var(--text-muted)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MessageSquare size={14} />
                    AI Developer
                  </div>
                </button>
              </div>

              {leftTab === 'chat' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    onClick={() => setShowHistoryTray(!showHistoryTray)}
                    title="Chat History"
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-muted)',
                      padding: 6, borderRadius: 6, cursor: 'pointer', display: 'flex'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    <History size={14} />
                  </button>
                  <button
                    onClick={handleNewChat}
                    title="New Chat"
                    style={{
                      background: 'none', border: 'none', color: 'var(--primary)',
                      padding: 6, borderRadius: 6, cursor: 'pointer', display: 'flex'
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Left Content Area */}
            {leftTab === 'terminal' ? (
              /* Build Terminal Logs & Stepper */
              <div style={{
                flex: 1, background: '#07070a', display: 'flex', flexDirection: 'column',
                overflow: 'hidden'
              }}>
                {/* Stepper Header (Only when generating or build is running) */}
                {generating && (
                  <div style={{
                    padding: '16px 18px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    background: '#0a0a10',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'stretch', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.05em' }}>COMPILER STATUS: ACTIVE</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#98c379' }}>{getProgressPercentage()}% Complete</span>
                    </div>
                    {/* Progress Bar */}
                    <div style={{ height: 4, background: 'rgba(255, 255, 255, 0.05)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${getProgressPercentage()}%`, background: 'var(--primary)', transition: 'width 0.3s ease' }} />
                    </div>
                    {/* Steps Checklist */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                      {steps.map((stepText, idx) => {
                        const stepNum = idx + 1
                        const isDone = currentStep >= stepNum
                        const isActive = currentStep === idx
                        const isPending = currentStep < idx

                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: isPending ? 0.35 : 1, transition: 'opacity 0.2s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, flexShrink: 0 }}>
                              {isDone ? (
                                <CheckCircle2 size={12} color="#98c379" />
                              ) : isActive ? (
                                <Loader2 size={12} className="spin" color="var(--primary)" />
                              ) : (
                                <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#5c6370' }} />
                              )}
                            </div>
                            <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--text)' : '#abb2bf' }}>
                              {stepText}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {/* Scrolling Logs */}
                <div style={{
                  flex: 1, padding: '14px 18px',
                  fontFamily: 'monospace', fontSize: '11px', color: '#abb2bf',
                  overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4
                }}>
                  {logs.map((log, idx) => (
                    <div key={idx} style={{
                      lineHeight: 1.6,
                      padding: '3px 6px',
                      borderRadius: 4,
                      background: log.type === 'error' ? 'rgba(224, 108, 117, 0.08)' : 'transparent',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      color: log.type === 'error' ? '#e06c75' :
                             log.type === 'success' ? '#98c379' :
                             log.type === 'warning' ? '#e5c07b' :
                             log.type === 'system' ? '#c678dd' : '#abb2bf'
                    }}>
                      <span style={{ color: '#5c6370', flexShrink: 0 }}>[{log.time}]</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {log.type === 'error' && '❌ '}
                        {log.type === 'success' && '✔ '}
                        {log.type === 'warning' && '⚠️ '}
                        {log.type === 'system' && '⚙️ '}
                        {log.text}
                      </span>
                    </div>
                  ))}
                  <div ref={consoleEndRef} />
                </div>
              </div>
            ) : (
              /* Professional Multi-Thread AI Developer Chat */
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {/* Active thread identifier banner */}
                <div style={{
                  padding: '6px 16px', background: 'var(--surface-2)',
                  borderBottom: '1px solid var(--border)', fontSize: 11,
                  color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between'
                }}>
                  <span>Thread: <strong>{activeChat.title}</strong></span>
                  <span>{activeChat.history.length} messages</span>
                </div>

                {/* Messages list */}
                <div style={{
                  flex: 1, padding: '16px', overflowY: 'auto',
                  display: 'flex', flexDirection: 'column', gap: 12
                }}>
                  {activeChat.history.length === 0 && (
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', height: '100%', color: 'var(--text-muted)',
                      textAlign: 'center', gap: 8
                    }}>
                      <MessageSquare size={24} style={{ opacity: 0.5 }} />
                      <p style={{ fontSize: 12 }}>This thread is empty.</p>
                      <p style={{ fontSize: 11, maxWidth: 200 }}>
                        Describe changes you'd like to make to the code or design below.
                      </p>
                    </div>
                  )}

                  {activeChat.history.map((m, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '10px 14px', borderRadius: 8, fontSize: 12,
                        lineHeight: 1.5, maxWidth: '85%',
                        background: m.role === 'user' ? 'rgba(99,102,241,0.12)' : 'var(--surface-2)',
                        alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                        border: m.role === 'user' ? '1px solid rgba(99,102,241,0.2)' : '1px solid var(--border)'
                      }}
                    >
                      <div style={{
                        fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                        color: m.role === 'user' ? 'var(--primary)' : 'var(--accent)',
                        marginBottom: 4
                      }}>
                        {m.role === 'user' ? 'You' : 'AI Assistant'}
                      </div>
                      <div style={{ color: 'var(--text)' }}>{m.content}</div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat History Tray overlay */}
                <AnimatePresence>
                  {showHistoryTray && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      style={{
                        position: 'absolute', top: 48, bottom: 64, left: 0, right: 0,
                        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
                        padding: 16, zIndex: 10, display: 'flex', flexDirection: 'column'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>Conversation Threads</span>
                        <button
                          onClick={() => setShowHistoryTray(false)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {chats.map(c => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setActiveChatId(c.id)
                              setShowHistoryTray(false)
                            }}
                            style={{
                              width: '100%', padding: '10px 14px', borderRadius: 8,
                              background: activeChatId === c.id ? 'var(--surface-2)' : 'transparent',
                              border: '1px solid',
                              borderColor: activeChatId === c.id ? 'var(--border)' : 'transparent',
                              color: activeChatId === c.id ? 'var(--primary)' : 'var(--text-muted)',
                              textAlign: 'left', cursor: 'pointer', fontSize: 12,
                              display: 'flex', alignItems: 'center', gap: 8
                            }}
                          >
                            <MessageSquare size={12} />
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {c.title}
                            </span>
                            <span style={{ fontSize: 10, opacity: 0.6 }}>({c.history.length})</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Input Container */}
                <div style={{ padding: '16px 20px', display: 'flex', gap: 8, borderTop: '1px solid var(--border)' }}>
                  <input
                    value={chatMsg}
                    onChange={e => setChatMsg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                    disabled={!done}
                    placeholder={done ? "Ask AI to make changes..." : "Generating site workspace..."}
                    style={{
                      flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)',
                      borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'var(--text)',
                      outline: 'none', opacity: done ? 1 : 0.6
                    }}
                  />
                  <button
                    onClick={handleSendChat}
                    disabled={!done || !chatMsg.trim()}
                    style={{
                      width: 34, height: 34, borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: done && chatMsg.trim() ? 1 : 0.4
                    }}
                  >
                    <Send size={13} color="#fff" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Code Viewer vs Live Preview Viewport */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header / Tabs */}
            <div style={{
              display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border)',
              padding: '0 16px', height: 48, gap: 10, justifySelf: 'stretch', background: 'var(--surface)'
            }}>
              {/* Pages selectors (Only show for HTML stack preview if files exist) */}
              <div style={{ display: 'flex', gap: 4, overflowX: 'auto', flex: 1, paddingRight: 8 }}>
                {rightView === 'preview' && stack === 'html' && pageTabs.map((page, idx) => {
                  const filename = page.toLowerCase() === 'home' ? 'index.html' : `${page.toLowerCase()}.html`
                  const exists = files[filename] || (idx === 0 && files['index.html'])
                  if (!exists) return null
                  return (
                    <button
                      key={page}
                      onClick={() => {
                        setActiveTab(idx)
                        setPreviewHtml(files[filename] || files['index.html'])
                      }}
                      style={{
                        padding: '4px 10px', borderRadius: 4, fontSize: 11, cursor: 'pointer',
                        background: activeTab === idx ? 'var(--surface-2)' : 'transparent',
                        border: '1px solid', borderColor: activeTab === idx ? 'var(--border)' : 'transparent',
                        color: activeTab === idx ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: activeTab === idx ? 600 : 400, whiteSpace: 'nowrap'
                      }}
                    >
                      {page}.html
                    </button>
                  )
                })}
              </div>

              {/* [Preview] vs [Code] Toggles (Centered/Right side) */}
              <div style={{
                display: 'flex', background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 6, padding: 2, marginRight: 8
              }}>
                <button
                  onClick={() => setRightView('preview')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, border: 'none',
                    padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer',
                    background: rightView === 'preview' ? 'var(--surface)' : 'transparent',
                    color: rightView === 'preview' ? 'var(--primary)' : 'var(--text-muted)'
                  }}
                >
                  <Eye size={12} />
                  Preview
                </button>
                <button
                  onClick={() => setRightView('code')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, border: 'none',
                    padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer',
                    background: rightView === 'code' ? 'var(--surface)' : 'transparent',
                    color: rightView === 'code' ? 'var(--primary)' : 'var(--text-muted)'
                  }}
                >
                  <Code2 size={12} />
                  Code
                </button>
              </div>

              {done && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/project/${projectId}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                    borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                    color: '#fff', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap'
                  }}
                >
                  <ExternalLink size={12} />
                  Open in Editor
                </motion.button>
              )}
            </div>

            {/* Viewport content */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              {rightView === 'preview' ? (
                /* Interactive Browser Preview */
                (stack === 'react' || stack === 'fullstack') ? (
                  /* Render beautiful React project dashboard */
                  <div style={{
                    height: '100%', width: '100%',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: '#0d0d14', gap: 20, padding: 24, textAlign: 'center'
                  }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: '50%',
                      background: 'rgba(99, 102, 241, 0.1)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)',
                      animation: 'pulse 2s infinite'
                    }}>
                      <Code2 size={32} color="var(--primary)" />
                    </div>
                    <div>
                      <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>
                        {stack === 'react' ? 'React + TypeScript Workspace' : 'React + Node.js Fullstack Workspace'}
                      </h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: 12, maxWidth: 300, margin: 0, lineHeight: 1.5 }}>
                        All workspace assets have been generated. Click the button below to open the project in the editor and start the live dev server!
                      </p>
                    </div>

                    <div style={{
                      display: 'flex', flexDirection: 'column', gap: 6,
                      background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '12px 18px', width: '100%', maxWidth: 280,
                      textAlign: 'left', fontSize: 11, fontFamily: 'monospace'
                    }}>
                      <div style={{ color: 'var(--text-muted)' }}>Generated files: <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{Object.keys(files).length}</span></div>
                      <div style={{ color: 'var(--text-muted)' }}>Tech stack: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{stack === 'react' ? 'React + Vite' : 'React + Node'}</span></div>
                      <div style={{ color: 'var(--text-muted)' }}>Theme: <span style={{ color: '#98c379', fontWeight: 600 }}>{theme}</span></div>
                    </div>

                    {done && (
                      <button
                        onClick={() => navigate(`/project/${projectId}`)}
                        style={{
                          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                          border: 'none', borderRadius: 6, padding: '10px 24px',
                          color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          boxShadow: '0 4px 15px rgba(99,102,241,0.3)', transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        Open in Editor & Run 🚀
                      </button>
                    )}
                    <style>{`
                      @keyframes pulse {
                        0% { transform: scale(1); opacity: 0.8; }
                        50% { transform: scale(1.05); opacity: 1; }
                        100% { transform: scale(1); opacity: 0.8; }
                      }
                    `}</style>
                  </div>
                ) : previewHtml ? (
                  <iframe
                    ref={iframeRef}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title="Preview"
                  />
                ) : (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', height: '100%', background: '#0b0b12', gap: 12
                  }}>
                  </div>
                )
              ) : (
                /* Sleek VS Code Style Editor Workspace */
                <div style={{ display: 'flex', height: '100%', background: '#080810', overflow: 'hidden' }}>
                  {/* Vertical Files Explorer Sidebar */}
                  <div style={{
                    width: 200, minWidth: 160, background: 'var(--surface)',
                    borderRight: '1px solid var(--border)', display: 'flex',
                    flexDirection: 'column', flexShrink: 0
                  }}>
                    <div style={{
                      padding: '10px 14px', borderBottom: '1px solid var(--border)',
                      fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
                      letterSpacing: '0.1em', textTransform: 'uppercase'
                    }}>
                      Explorer
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
                      {Object.keys(files).length === 0 ? (
                        <div style={{ padding: 20, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                          No files generated
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {Object.keys(files).sort().map((filename) => {
                            const isActive = filename === activeFilename
                            return (
                              <button
                                key={filename}
                                onClick={() => {
                                  const idx = tabsToShow.findIndex(t => t.filename === filename)
                                  if (idx !== -1) {
                                    setActiveTab(idx)
                                    if (stack === 'html') {
                                      setPreviewHtml(files[filename])
                                    }
                                  }
                                }}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 6,
                                  width: '100%', padding: '6px 10px', background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                                  border: 'none', borderLeft: `2px solid ${isActive ? 'var(--primary)' : 'transparent'}`,
                                  borderRadius: 4, cursor: 'pointer', textAlign: 'left',
                                  fontSize: 11, color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                                  transition: 'all 0.1s'
                                }}
                                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                              >
                                <span style={{ color: filename.endsWith('.html') ? '#e34c26' : filename.endsWith('.css') ? '#7c3aed' : filename.endsWith('.json') ? '#89e051' : '#06b6d4', fontSize: 10 }}>●</span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontFamily: 'monospace' }}>
                                  {filename}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Code Viewer Panel */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0f0f17' }}>
                    {/* Code Tool Actions */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 16px', background: '#09090d', borderBottom: '1px solid #1c1c28',
                      height: 34, flexShrink: 0
                    }}>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#abb2bf' }}>
                        {activeFilename || 'No file selected'} &mdash; Source code
                      </span>
                      {activeFilename && (
                        <button
                          onClick={handleCopyCode}
                          style={{
                            background: 'none', border: 'none', color: '#abb2bf',
                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                            gap: 6, fontSize: 11, fontWeight: 500
                          }}
                        >
                          {copied ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                          {copied ? 'Copied' : 'Copy'}
                        </button>
                      )}
                    </div>

                    {/* Preformatted Code Content */}
                    <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                      <pre style={{
                        margin: 0, fontFamily: 'monospace', fontSize: 12,
                        lineHeight: 1.6, color: '#e5c07b', whiteSpace: 'pre-wrap'
                      }}>
                        <code>{activeCodeContent || 'Select a file from the explorer to view code.'}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <style>{`
            .spin { animation: spin 1s linear infinite; }
            @keyframes spin { to { transform: rotate(360deg); } }
            select option { background: var(--surface); color: var(--text); }
          `}</style>
        </motion.div>
      )}

    </AnimatePresence>

      {/* Generation error overlay — outside AnimatePresence to avoid multiple-children-in-wait-mode */}
    {generationError && phase === 'generating' && (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
      }}>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 32, maxWidth: 420, width: '90%', textAlign: 'center'
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>Generation Failed</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>{generationError}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={() => { setGenerationError(null); setPhase('input'); setGenerating(false) }}
              style={{
                padding: '8px 20px', borderRadius: 6, border: '1px solid var(--border)',
                background: 'var(--surface-2)', color: 'var(--text)', fontSize: 13,
                fontWeight: 600, cursor: 'pointer'
              }}
            >
              Go Back
            </button>
            <button
              onClick={() => { setGenerationError(null); handleGenerate() }}
              style={{
                padding: '8px 20px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                color: '#fff', fontSize: 13, fontWeight: 600
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

export default function NewProject() {
  return (
    <ErrorBoundary>
      <NewProjectInner />
    </ErrorBoundary>
  )
}
