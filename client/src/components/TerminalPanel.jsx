import { useEffect, useRef, useState } from 'react'
import { RefreshCw, Maximize2 } from 'lucide-react'

let xtermLoaded = false
let TerminalClass = null
let FitAddonClass = null

async function loadXterm() {
  if (xtermLoaded) return
  const [{ Terminal }, { FitAddon }] = await Promise.all([
    import('@xterm/xterm'),
    import('@xterm/addon-fit'),
  ])
  // Import CSS once
  await import('@xterm/xterm/css/xterm.css')
  TerminalClass = Terminal
  FitAddonClass = FitAddon
  xtermLoaded = true
}

export default function TerminalPanel({ projectId, stack, visible, wsRef: externalWsRef, onDevServerStart }) {
  const containerRef = useRef(null)
  const termRef = useRef(null)
  const fitAddonRef = useRef(null)
  const localWsRef = useRef(null)
  const wsRef = externalWsRef || localWsRef
  const [status, setStatus] = useState('disconnected') // 'connecting' | 'connected' | 'disconnected' | 'error'
  const [loaded, setLoaded] = useState(false)
  const outputBufferRef = useRef('')
  const autoStartSentRef = useRef(false)

  // Initialize xterm.js (once)
  useEffect(() => {
    let cancelled = false

    const init = async () => {
      await loadXterm()
      if (cancelled || !containerRef.current || termRef.current) return

      const term = new TerminalClass({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: "'Fira Code', 'Cascadia Code', monospace",
        theme: {
          background: '#0a0a0f',
          foreground: '#d4d4d8',
          cursor: '#6366f1',
          cursorAccent: '#0a0a0f',
          selectionBackground: 'rgba(99,102,241,0.3)',
          black: '#1e1e2e',
          red: '#f38ba8',
          green: '#a6e3a1',
          yellow: '#f9e2af',
          blue: '#89b4fa',
          magenta: '#cba6f7',
          cyan: '#89dceb',
          white: '#cdd6f4',
          brightBlack: '#585b70',
          brightGreen: '#a6e3a1',
          brightYellow: '#f9e2af',
          brightBlue: '#89b4fa',
          brightMagenta: '#cba6f7',
          brightCyan: '#89dceb',
          brightWhite: '#cdd6f4',
        },
        convertEol: true,
        scrollback: 1000,
      })

      const fitAddon = new FitAddonClass()
      term.loadAddon(fitAddon)
      term.open(containerRef.current)
      fitAddon.fit()

      termRef.current = term
      fitAddonRef.current = fitAddon
      setLoaded(true)

      term.writeln('\x1b[90mTerminal ready. Connecting...\x1b[0m')
      connect(term, fitAddon)
    }

    init()
    return () => { cancelled = true }
  }, [])

  // Fit on visibility change
  useEffect(() => {
    if (visible && fitAddonRef.current) {
      setTimeout(() => fitAddonRef.current?.fit(), 50)
    }
  }, [visible])

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => {
      if (fitAddonRef.current) fitAddonRef.current.fit()
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  function connect(term, fitAddon) {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setStatus('connecting')
    outputBufferRef.current = ''
    
    // Dynamically build WS URL from VITE_API_URL or current location
    const apiURL = import.meta.env.VITE_API_URL || ''
    let wsUrl
    if (apiURL.startsWith('http')) {
      const url = new URL(apiURL)
      const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
      wsUrl = `${protocol}//${url.host}/terminal?projectId=${projectId}`
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      wsUrl = `${protocol}//${window.location.host}/terminal?projectId=${projectId}`
    }

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('connected')
      term.writeln('\x1b[32m✓ Connected\x1b[0m')
      
      // Auto-start command if React/Fullstack stack and not sent yet
      if ((stack === 'react' || stack === 'fullstack') && !autoStartSentRef.current) {
        autoStartSentRef.current = true
        term.writeln('\x1b[90mAuto-starting dev server...\x1b[0m')
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            const startCmd = stack === 'fullstack'
              ? 'npm install && cd server && npm install && cd .. && npm run dev\n'
              : 'npm install && npm run dev\n'
            ws.send(JSON.stringify({
              type: 'input',
              data: startCmd
            }))
          }
        }, 1000)
      }
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'output') {
          term.write(msg.data)
          // Check if dev server started and extract URL
          if (onDevServerStart) {
            // Strip ANSI escape codes to parse clean text
            const cleanData = msg.data.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')
            // Accumulate in buffer
            outputBufferRef.current = (outputBufferRef.current + cleanData).slice(-4000)
            
            // Search for local server URLs in the accumulated buffer
            const match = outputBufferRef.current.match(/(https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0):\d+)/i)
            if (match) {
              const url = match[1].replace('0.0.0.0', 'localhost')
              onDevServerStart(url)
            }
          }
        }
      } catch {}
    }

    ws.onerror = () => {
      setStatus('error')
      term.writeln('\x1b[31m✗ WebSocket error\x1b[0m')
    }

    ws.onclose = () => {
      setStatus('disconnected')
      term.writeln('\r\n\x1b[90m[Disconnected]\x1b[0m')
    }

    // Send keystrokes
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }))
      }
    })
  }

  const handleReconnect = () => {
    if (termRef.current && fitAddonRef.current) {
      termRef.current.clear()
      connect(termRef.current, fitAddonRef.current)
    }
  }

  useEffect(() => {
    return () => {
      wsRef.current?.close()
      termRef.current?.dispose()
    }
  }, [])

  const statusColor = status === 'connected' ? '#22c55e' : status === 'error' ? '#ef4444' : '#f59e0b'
  const statusLabel = { connecting: 'Connecting…', connected: 'Connected', disconnected: 'Disconnected', error: 'Error' }[status]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0a0f' }}>
      {/* Terminal toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '4px 12px', background: '#07070c', borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0, height: 32
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
          <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>{statusLabel}</span>
        </div>
        <button
          onClick={handleReconnect}
          title="Reconnect"
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', padding: 4, borderRadius: 4 }}
          onMouseEnter={e => e.currentTarget.style.color = '#aaa'}
          onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {/* xterm container */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          padding: '8px 4px',
          overflow: 'hidden',
          display: visible ? 'block' : 'none',
        }}
      />
    </div>
  )
}
