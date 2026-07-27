import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import {
  ArrowLeft, Save, Download, Share2,
  Monitor, Tablet, Smartphone,
  X, RefreshCw, ExternalLink,
  Terminal as TerminalIcon, Eye,
  FilePlus, Pencil, LayoutPanelLeft, Check,
  Play, Sparkles, Info,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { supabase } from '../lib/supabase'
import FileTree from '../components/FileTree'
import TerminalPanel from '../components/TerminalPanel'
import AiChat from '../components/AiChat'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const deviceWidths = { desktop: '100%', tablet: '768px', mobile: '390px' }

function getLanguage(filename) {
  if (!filename) return 'plaintext'
  const ext = filename.split('.').pop()?.toLowerCase()
  return { tsx: 'typescript', ts: 'typescript', jsx: 'javascript', js: 'javascript', css: 'css', html: 'html', json: 'json', md: 'markdown' }[ext] || 'plaintext'
}

function getTabDot(filename) {
  const ext = filename?.split('.').pop()?.toLowerCase()
  return { tsx: '#06b6d4', ts: '#06b6d4', jsx: '#f0db4f', js: '#f0db4f', css: '#a855f7', html: '#f97316', json: '#89e051', md: '#94a3b8' }[ext] || '#64748b'
}

// Build a live preview HTML from project files (inlines CSS + JS)
function buildPreviewHtml(files) {
  const html = files['index.html'] || ''
  if (!html) return ''
  const css = files['style.css'] || files['styles.css'] || files['src/styles/globals.css'] || files['src/App.css'] || ''
  const js = files['script.js'] || files['src/main.js'] || ''

  let result = html
  if (css && html.includes('</head>')) {
    result = result.replace('</head>', `<style>\n${css}\n</style>\n</head>`)
  }
  if (js && html.includes('</body>')) {
    result = result.replace('</body>', `<script>\n${js}\n</script>\n</body>`)
  }
  return result
}

const MONACO_THEME = {
  base: 'vs-dark', inherit: true,
  rules: [
    { token: 'comment', foreground: '4a4a6a', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'a855f7' },
    { token: 'string', foreground: '22c55e' },
    { token: 'number', foreground: 'f97316' },
    { token: 'type', foreground: '06b6d4' },
  ],
  colors: {
    'editor.background': '#080810',
    'editor.foreground': '#e2e0f0',
    'editor.lineHighlightBackground': '#13131f',
    'editor.selectionBackground': '#6366f130',
    'editorLineNumber.foreground': '#2d2d4a',
    'editorLineNumber.activeForeground': '#6366f1',
    'editorCursor.foreground': '#6366f1',
    'editorIndentGuide.background': '#1a1a2e',
  }
}

// ─── Drag Divider ─────────────────────────────────────────────────────────────

function DragDivider({ onDrag, vertical = true }) {
  const dragging = useRef(false)

  const handleMouseDown = (e) => {
    e.preventDefault()
    dragging.current = true
    document.body.style.cursor = vertical ? 'col-resize' : 'row-resize'
    document.body.style.userSelect = 'none'

    const onMove = (me) => { if (dragging.current) onDrag(me) }
    const onUp = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        [vertical ? 'width' : 'height']: 4,
        background: 'var(--border)',
        cursor: vertical ? 'col-resize' : 'row-resize',
        flexShrink: 0, transition: 'background 0.15s', zIndex: 1,
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--primary)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--border)'}
    />
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProjectEditor() {
  const { id } = useParams()
  const navigate = useNavigate()

  // Project data
  const [project, setProject] = useState(null)
  const [files, setFiles] = useState({})
  const [title, setTitle] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [modifiedFiles, setModifiedFiles] = useState(new Set())
  const [saved, setSaved] = useState(false) // brief "saved" indicator

  // Editor tabs
  const [openTabs, setOpenTabs] = useState([])
  const [activeFile, setActiveFile] = useState(null)

  // Panel widths
  const [fileTreeWidth, setFileTreeWidth] = useState(220)
  const [rightPanelWidth, setRightPanelWidth] = useState(400)
  const [rightTab, setRightTab] = useState('preview')
  const [chatOpen, setChatOpen] = useState(false)
  const [showFileTree, setShowFileTree] = useState(false)
  const [showPromptModal, setShowPromptModal] = useState(false)

  // Preview
  const [device, setDevice] = useState('desktop')
  const iframeRef = useRef(null)

  // Dev server references for React projects
  const [devServerRunning, setDevServerRunning] = useState(false)
  const [devServerUrl, setDevServerUrl] = useState('http://localhost:5173')
  const wsRef = useRef(null)

  // Refs
  const titleInputRef = useRef(null)
  const autoSaveRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => { if (editingTitle) titleInputRef.current?.focus() }, [editingTitle])

  // ── Load project ─────────────────────────────────────────────────────────────

  useEffect(() => {
    loadProject()
    return () => clearInterval(autoSaveRef.current)
  }, [id])

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects').select('*').eq('id', id).single()
      if (error) throw error

      setProject(data)
      setTitle(data.title || 'Untitled')
      const genFiles = data.generated_files || {}
      setFiles(genFiles)

      const keys = Object.keys(genFiles)
      const first = keys.find(k => k.endsWith('.html')) || keys[0]
      if (first) { setOpenTabs([first]); setActiveFile(first) }
    } catch {
      toast.error('Failed to load project')
      navigate('/dashboard')
    }
  }

  // ── Preview (srcdoc-based) ────────────────────────────────────────────────────

  const updatePreview = (currentFiles) => {
    const iframe = iframeRef.current
    if (!iframe) return

    let html = currentFiles['index.html'] || ''
    const css = currentFiles['style.css'] || currentFiles['styles.css'] || ''
    const js = currentFiles['script.js'] || currentFiles['scripts.js'] || ''

    // Inject CSS if separate file
    if (css && !html.includes(css)) {
      html = html.replace(
        '</head>',
        `<style>${css}</style></head>`
      )
    }

    // Inject JS if separate file
    if (js && !html.includes(js)) {
      html = html.replace(
        '</body>',
        `<script>${js}</script></body>`
      )
    }

    // Use srcdoc for sandboxed preview
    iframe.srcdoc = html
  }

  // Trigger on file changes or tab changes
  useEffect(() => {
    if (project?.stack === 'html' && rightTab === 'preview' && files && Object.keys(files).length > 0) {
      const timer = setTimeout(() => {
        updatePreview(files)
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [files, rightTab, project?.stack])

  // ── Editor changes ────────────────────────────────────────────────────────────

  const handleEditorChange = (value) => {
    if (!activeFile) return
    setFiles(prev => {
      const next = { ...prev, [activeFile]: value }
      if (project?.stack === 'html') {
        updatePreview(next)
      }
      return next
    })
    setModifiedFiles(prev => new Set([...prev, activeFile]))
  }

  // ── File tree ops ────────────────────────────────────────────────────────────

  const openFile = (filename) => {
    setActiveFile(filename)
    setOpenTabs(prev => prev.includes(filename) ? prev : [...prev, filename])
  }

  const handleCreateFile = () => {
    const name = window.prompt('New file name (e.g. src/components/Button.tsx):')
    if (!name?.trim()) return
    setFiles(prev => ({ ...prev, [name.trim()]: '' }))
    openFile(name.trim())
  }

  const handleDeleteFile = (filename) => {
    if (!window.confirm(`Delete "${filename}"?`)) return
    setFiles(prev => { const n = { ...prev }; delete n[filename]; return n })
    setOpenTabs(prev => prev.filter(t => t !== filename))
    if (activeFile === filename) {
      const rem = openTabs.filter(t => t !== filename)
      setActiveFile(rem.at(-1) || null)
    }
  }

  const handleRenameFile = (filename) => {
    const newName = window.prompt('Rename to:', filename)
    if (!newName?.trim() || newName === filename) return
    setFiles(prev => { const n = { ...prev, [newName.trim()]: prev[filename] }; delete n[filename]; return n })
    setOpenTabs(prev => prev.map(t => t === filename ? newName.trim() : t))
    if (activeFile === filename) setActiveFile(newName.trim())
  }

  const handleDuplicateFile = (filename) => {
    const ext = filename.includes('.') ? '.' + filename.split('.').pop() : ''
    const base = filename.includes('.') ? filename.slice(0, filename.lastIndexOf('.')) : filename
    const newName = `${base}_copy${ext}`
    setFiles(prev => ({ ...prev, [newName]: prev[filename] }))
    openFile(newName)
  }

  // ── Tab close ────────────────────────────────────────────────────────────────

  const closeTab = (e, filename) => {
    e.stopPropagation()
    const next = openTabs.filter(t => t !== filename)
    setOpenTabs(next)
    if (activeFile === filename) setActiveFile(next.at(-1) || null)
  }

  // ── Save ──────────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    try {
      await api.put(`/projects/${id}`, { generated_files: files, title })
      setModifiedFiles(new Set())
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('[handleSave] Save failed:', err)
      toast.error('Save failed')
    }
  }, [files, title, id])

  useEffect(() => {
    autoSaveRef.current = setInterval(() => { if (modifiedFiles.size > 0) handleSave() }, 5000)
    return () => clearInterval(autoSaveRef.current)
  }, [modifiedFiles, handleSave])

  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave() }
      if ((e.ctrlKey || e.metaKey) && e.key === '`') { e.preventDefault(); setRightTab(t => t === 'terminal' ? 'preview' : 'terminal') }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); setShowFileTree(t => !t) }
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') { e.preventDefault(); setChatOpen(t => !t) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [handleSave])

  // ── Download ──────────────────────────────────────────────────────────────────

  const getPreviewUrl = () => {
    if (project?.stack === 'react' || project?.stack === 'fullstack') {
      return devServerUrl
    } else {
      return `${window.location.origin}/api/projects/${id}/preview`
    }
  }

  const handleDownload = async () => {
    try {
      const res = await api.get(`/projects/${id}/download`, { responseType: 'blob' })
      let filename = `${title || 'project'}.zip`
      const disposition = res.headers['content-disposition']
      if (disposition) {
        const matches = disposition.match(/filename="?([^";]+)"?/)
        if (matches && matches[1]) {
          filename = matches[1]
        }
      }
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Download started!')
    } catch (err) {
      console.error('[Download] Error:', err)
      toast.error('Download failed')
    }
  }

  const handleOpenNewTab = () => {
    window.open(getPreviewUrl(), '_blank')
  }

  // ── Drag resize ───────────────────────────────────────────────────────────────

  const handleFileTreeDrag = (e) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setFileTreeWidth(Math.max(140, Math.min(400, e.clientX - rect.left)))
  }

  const handleRightDrag = (e) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setRightPanelWidth(Math.max(200, Math.min(700, rect.right - e.clientX)))
  }

  // ── Apply AI changes ──────────────────────────────────────────────────────────

  const handleApplyChanges = (updatedFiles) => {
    setFiles(prev => {
      const next = { ...prev, ...updatedFiles }
      if (project?.stack === 'html') {
        updatePreview(next)
      }
      return next
    })
    setModifiedFiles(prev => {
      const n = new Set(prev)
      Object.keys(updatedFiles).forEach(f => n.add(f))
      return n
    })
    const first = Object.keys(updatedFiles)[0]
    if (first) openFile(first)
    toast.success(`Applied ${Object.keys(updatedFiles).length} file(s)`)
  }

  // ── Monaco mount ──────────────────────────────────────────────────────────────

  const handleEditorMount = (editor, monaco) => {
    monaco.editor.defineTheme('webgen-dark', MONACO_THEME)
    monaco.editor.setTheme('webgen-dark')
  }

  if (!project) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 64px)', background: 'var(--bg)' }}>
        <div style={{ width: 36, height: 36, border: '3px solid rgba(99,102,241,0.15)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* ══ TOP BAR ══ */}
      <div style={{
        height: 48, flexShrink: 0, display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 12, background: 'var(--surface)',
        borderBottom: '1px solid var(--border)'
      }}>
        {/* Left group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <button
            onClick={() => navigate('/dashboard')}
            title="Back to dashboard"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '5px', borderRadius: 6, display: 'flex', flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <ArrowLeft size={16} />
          </button>

          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={e => { if (e.key === 'Enter') setEditingTitle(false) }}
              style={{ background: 'var(--bg)', border: '1px solid var(--primary)', borderRadius: 6, padding: '4px 9px', fontSize: 14, fontWeight: 600, color: 'var(--text)', outline: 'none', width: 200 }}
            />
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              className="title-btn"
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: 14, fontWeight: 600, padding: '4px 6px', borderRadius: 6 }}
            >
              {title || 'Untitled'}
              {modifiedFiles.size > 0 && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f97316', flexShrink: 0 }} title="Unsaved changes" />}
              <Pencil size={12} color="var(--text-muted)" style={{ opacity: 0.6 }} />
            </button>
          )}

          {project?.prompt && (
            <button
              onClick={() => setShowPromptModal(true)}
              title="View original prompt"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', padding: '5px', borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <Info size={14} />
            </button>
          )}

          <button
            onClick={() => setShowFileTree(t => !t)}
            title="Toggle File Tree (Ctrl+B)"
            style={{ background: showFileTree ? 'rgba(99,102,241,0.12)' : 'none', border: 'none', cursor: 'pointer', color: showFileTree ? 'var(--primary)' : 'var(--text-muted)', padding: '5px 6px', borderRadius: 6, display: 'flex', flexShrink: 0 }}
          >
            <LayoutPanelLeft size={14} />
          </button>
        </div>

        {/* Right group */}
        <div style={{ display: 'flex', gap: 6 }}>
          {project?.stack === 'html' && (
            <button
              onClick={() => {
                setRightTab('preview')
                setTimeout(() => updatePreview(files), 50)
              }}
              title="Run App (Render Preview)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 12px',
                borderRadius: 7,
                border: 'none',
                cursor: 'pointer',
                background: '#22c55e',
                color: 'white',
                fontSize: 12,
                fontWeight: 600,
                transition: 'all .15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#16a34a'}
              onMouseLeave={e => e.currentTarget.style.background = '#22c55e'}
            >
              <Play size={14} fill="currentColor" /> Run
            </button>
          )}
          <button
            onClick={handleDownload}
            title="Download Project"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 7, border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--surface-2)', color: 'var(--text)', fontSize: 12, fontWeight: 500 }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <Download size={14} /> Download
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(getPreviewUrl())
              toast.success('Preview link copied!')
            }}
            title="Copy preview link"
            style={{ display: 'flex', alignItems: 'center', padding: '5px 9px', borderRadius: 7, border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--surface-2)', color: 'var(--text)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <Share2 size={14} />
          </button>
          <button
            onClick={() => setChatOpen(t => !t)}
            title="Toggle AI Assistant (Ctrl+J)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 11px',
              borderRadius: 7,
              border: '1px solid var(--border)',
              cursor: 'pointer',
              background: chatOpen ? 'rgba(99,102,241,0.15)' : 'var(--surface-2)',
              color: chatOpen ? 'var(--primary)' : 'var(--text)',
              fontSize: 12,
              fontWeight: 500,
              transition: 'all .15s'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <Sparkles size={14} color={chatOpen ? 'var(--primary)' : 'var(--text-muted)'} />
            AI Assistant
          </button>
        </div>
      </div>

      {/* ══ EDITOR + PREVIEW ROW ══ */}
      <div ref={containerRef} style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Left Side: Files + Editor */}
        <div style={{ flex: '1 1 50%', display: 'flex', overflow: 'hidden', minWidth: 0 }}>
          {/* ── File Tree ── */}
          {showFileTree && (
            <>
              <div style={{ width: fileTreeWidth, minWidth: 140, maxWidth: 400, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
                <FileTree
                  files={files}
                  activeFile={activeFile}
                  onFileSelect={openFile}
                  onCreateFile={handleCreateFile}
                  onDeleteFile={handleDeleteFile}
                  onRenameFile={handleRenameFile}
                  onDuplicateFile={handleDuplicateFile}
                />
              </div>
              <DragDivider onDrag={handleFileTreeDrag} />
            </>
          )}

          {/* ── Editor Panel ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', background: '#080810' }}>
          {/* File tabs */}
          <div style={{ display: 'flex', background: 'var(--bg)', borderBottom: '1px solid var(--border)', overflowX: 'auto', flexShrink: 0, height: 40, scrollbarWidth: 'none' }}>
            {openTabs.map(tab => {
              const isActive = tab === activeFile
              return (
                <div
                  key={tab}
                  onClick={() => setActiveFile(tab)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px',
                    height: '100%', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
                    flexShrink: 0, borderRight: '1px solid var(--border)',
                    background: isActive ? 'var(--surface)' : 'transparent',
                    color: isActive ? 'var(--text)' : '#5a5a7a',
                    borderBottom: isActive ? `2px solid ${getTabDot(tab)}` : '2px solid transparent',
                    transition: 'all .1s'
                  }}
                >
                  {modifiedFiles.has(tab) && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f97316', flexShrink: 0 }} />}
                  <span style={{ color: getTabDot(tab), fontSize: 8 }}>●</span>
                  <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>{tab.split('/').pop()}</span>
                  <span
                    onClick={e => closeTab(e, tab)}
                    style={{ fontSize: 14, color: '#5a5a7a', padding: '1px 2px', borderRadius: 3, display: 'flex', lineHeight: 1, cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#5a5a7a'; e.currentTarget.style.background = 'transparent' }}
                  >
                    ×
                  </span>
                </div>
              )
            })}
            {openTabs.length === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: 12, color: '#3a3a5a' }}>
                ← Select a file to edit
              </div>
            )}
          </div>

          {/* Monaco */}
          <div style={{ flex: 1, minHeight: 0 }}>
            {activeFile ? (
              <Editor
                key={activeFile}
                language={getLanguage(activeFile)}
                value={files[activeFile] || ''}
                onChange={handleEditorChange}
                theme="webgen-dark"
                onMount={handleEditorMount}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  fontFamily: "'Fira Code', 'Cascadia Code', monospace",
                  fontLigatures: true,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 16, bottom: 16 },
                  wordWrap: 'on',
                  renderLineHighlight: 'line',
                  cursorBlinking: 'smooth',
                  smoothScrolling: true,
                  bracketPairColorization: { enabled: true },
                }}
              />
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#080810', color: '#2d2d4a', gap: 8 }}>
                <FilePlus size={36} />
                <p style={{ fontSize: 13 }}>Select a file from the tree</p>
              </div>
            )}
          </div>
        </div>

        {/* Divider line between Editor and Right Panel */}
        <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />

        {/* ── Right Panel ── */}
        <div style={{ width: '50%', flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Tab bar */}
          <div style={{ height: 40, display: 'flex', alignItems: 'center', background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 8px', gap: 4, flexShrink: 0 }}>
            {[
              { id: 'preview', label: 'Preview', icon: <Eye size={13} /> },
              { id: 'terminal', label: 'Terminal', icon: <TerminalIcon size={13} /> },
            ].map(({ id: tid, label, icon }) => (
              <button key={tid} onClick={() => setRightTab(tid)} style={{
                display: 'flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px',
                borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                background: rightTab === tid ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: rightTab === tid ? 'var(--primary)' : 'var(--text-muted)'
              }}>
                {icon}{label}
              </button>
            ))}

            {/* Preview controls */}
            {rightTab === 'preview' && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                {[['desktop', <Monitor size={12} />], ['tablet', <Tablet size={12} />], ['mobile', <Smartphone size={12} />]].map(([d, icon]) => (
                  <button key={d} onClick={() => setDevice(d)} style={{
                    padding: '3px 6px', borderRadius: 4, border: 'none', cursor: 'pointer', display: 'flex',
                    background: device === d ? 'rgba(99,102,241,0.2)' : 'transparent',
                    color: device === d ? 'var(--primary)' : 'var(--text-muted)'
                  }}>{icon}</button>
                ))}
                <button
                  onClick={() => updatePreview(files)}
                  title="Reload preview"
                  style={{ padding: '3px 6px', borderRadius: 4, border: 'none', cursor: 'pointer', display: 'flex', background: 'transparent', color: 'var(--text-muted)' }}
                >
                  <RefreshCw size={12} />
                </button>
                <button
                  onClick={handleOpenNewTab}
                  title="Open in new tab"
                  style={{ padding: '3px 6px', borderRadius: 4, border: 'none', cursor: 'pointer', display: 'flex', background: 'transparent', color: 'var(--text-muted)' }}
                >
                  <ExternalLink size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Preview tab */}
          <div style={{ flex: 1, overflow: 'hidden', display: rightTab === 'preview' ? 'flex' : 'none', flexDirection: 'column' }}>
            {/* Fake browser bar */}
            <div style={{ height: 34, background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8, flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {['#ef4444', '#f59e0b', '#22c55e'].map(c => (
                  <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
                ))}
              </div>
              <div style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 5, height: 22, padding: '0 8px', display: 'flex', alignItems: 'center', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                {project?.stack === 'html' ? 'localhost:3000' : devServerUrl.replace(/^https?:\/\//, '')}
              </div>
            </div>
            {/* Preview Area */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', background: '#e5e5e5', overflow: 'auto' }}>
              {(project?.stack === 'react' || project?.stack === 'fullstack') && !devServerRunning ? (
                <div style={{
                  height: '100%', width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#0d0d14',
                  gap: '16px'
                }}>
                  <div style={{ fontSize: '48px' }}>⚡</div>
                  <h3 style={{ 
                    color: '#f8f7ff', 
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 600 
                  }}>
                    Ready to Run
                  </h3>
                  <p style={{ 
                    color: '#8b8ba0', 
                    margin: 0,
                    fontSize: '13px',
                    textAlign: 'center',
                    maxWidth: '260px'
                  }}>
                    Ask AI to run your app, or type in terminal:
                  </p>
                  <code style={{
                    background: '#13131f',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    color: '#22c55e',
                    fontSize: '13px',
                    fontFamily: 'Fira Code, monospace'
                  }}>
                    npm install && npm run dev
                  </code>
                  <button
                    onClick={() => {
                      // Switch to terminal tab
                      setRightTab('terminal')
                      // Send command to terminal via WebSocket
                      if (wsRef.current?.readyState === 1) {
                        wsRef.current.send(JSON.stringify({
                          type: 'input',
                          data: 'npm install && npm run dev\n'
                        }))
                      }
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 20px',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    ▶ Run in Terminal
                  </button>
                </div>
              ) : project?.stack === 'html' ? (
                <iframe
                  ref={iframeRef}
                  style={{
                    width: deviceWidths[device],
                    height: '100%',
                    border: device !== 'desktop' ? '1px solid #ccc' : 'none',
                    borderRadius: device !== 'desktop' ? 8 : 0,
                    transition: 'width .3s ease',
                    background: 'white',
                    display: 'block'
                  }}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                  title="Preview"
                />
              ) : (
                <iframe
                  src={devServerUrl}
                  style={{
                    width: deviceWidths[device],
                    height: '100%',
                    border: device !== 'desktop' ? '1px solid #ccc' : 'none',
                    borderRadius: device !== 'desktop' ? 8 : 0,
                    transition: 'width .3s ease',
                    background: 'white',
                    display: 'block'
                  }}
                  title="Preview"
                />
              )}
            </div>
          </div>

          {/* Terminal tab — always mounted to preserve state */}
          <div style={{ flex: 1, overflow: 'hidden', display: rightTab === 'terminal' ? 'flex' : 'none', flexDirection: 'column' }}>
            <TerminalPanel
              projectId={id}
              stack={project?.stack}
              visible={rightTab === 'terminal'}
              wsRef={wsRef}
              onDevServerStart={(url) => {
                setDevServerRunning(true)
                if (url) setDevServerUrl(url)
                setRightTab('preview')
              }}
            />
          </div>

          </div>
        </div>

        {/* AI Assistant Sidebar (Rightmost) */}
        {chatOpen && (
          <>
            <div style={{ width: 1, background: 'var(--border)', flexShrink: 0 }} />
            <div style={{ width: 340, minWidth: 300, maxWidth: 450, background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
              <AiChat
                projectId={id}
                project={project}
                files={files}
                stack={project?.stack}
                onApplyChanges={handleApplyChanges}
                mode="panel"
              />
            </div>
          </>
        )}
      </div>

      {/* ══ PROMPT MODAL ══ */}
      {showPromptModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 5, 8, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 24
        }} onClick={() => setShowPromptModal(false)}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 24, maxWidth: 500, width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)', display: 'flex',
            flexDirection: 'column', gap: 16, position: 'relative'
          }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowPromptModal(false)}
              style={{
                position: 'absolute', top: 16, right: 16, background: 'none',
                border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                padding: 4, borderRadius: 6, display: 'flex'
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <X size={16} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} color="var(--primary)" />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Original Prompt</h3>
            </div>
            <div style={{
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 16, maxHeight: 300, overflowY: 'auto',
              fontSize: 13, lineHeight: 1.6, color: 'var(--text-muted)',
              whiteSpace: 'pre-wrap', fontFamily: 'inherit'
            }}>
              {project?.prompt || 'No prompt stored for this project.'}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .title-btn:hover .pencil-icon { opacity: 1 !important; }
      `}</style>
    </div>
  )
}
