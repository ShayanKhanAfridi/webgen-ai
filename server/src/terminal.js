import { WebSocketServer } from 'ws'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { getProjectDir, syncProjectDbToDisk } from './lib/projectStorage.js'

export function setupTerminal(server) {
  const wss = new WebSocketServer({ server, path: '/terminal' })

  wss.on('connection', async (ws, req) => {
    const url = new URL(req.url, 'http://localhost')
    const projectId = url.searchParams.get('projectId')

    const projectDir = getProjectDir(projectId)

    // Sync database files to disk before spawning the terminal shell
    await syncProjectDbToDisk(projectId)

    const isWindows = process.platform === 'win32'

    const shell = spawn(
      isWindows ? 'cmd.exe' : 'bash',
      [],
      {
        cwd: projectDir,
        env: { ...process.env, FORCE_COLOR: '1' },
        windowsHide: false
      }
    )

    const send = (data) => {
      if (ws.readyState === 1) {
        try { ws.send(JSON.stringify({ type: 'output', data })) } catch {}
      }
    }

    // Welcome banner
    send('\r\n')
    send('  \x1b[35m█\x1b[0m \x1b[1mWebGen IDE v1.0.0\x1b[0m\r\n')
    send(`  Project: \x1b[36m${projectId}\x1b[0m\r\n`)
    send(`  Platform: \x1b[33m${process.platform}\x1b[0m\r\n`)
    send('  \x1b[90m────────────────────────\x1b[0m\r\n\r\n')

    shell.stdout.on('data', (data) => send(data.toString()))
    shell.stderr.on('data', (data) => send(data.toString()))

    shell.on('close', (code) => {
      send(`\r\n\x1b[90mProcess exited (${code})\x1b[0m\r\n`)
    })

    shell.on('error', (err) => {
      send(`\r\n\x1b[31mShell error: ${err.message}\x1b[0m\r\n`)
    })

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw)
        if (msg.type === 'input' && shell.stdin.writable) {
          let data = msg.data
          let echoData = msg.data
          
          if (isWindows) {
            // Normalize newlines to \r\n for Windows shell
            data = data.replace(/\r(?!\n)/g, '\r\n').replace(/(?<!\r)\n/g, '\r\n')
          }
          
          shell.stdin.write(data)

          // Echo back the typed keys to the client for interactive visual response
          if (echoData === '\r') {
            echoData = '\r\n'
          } else if (echoData === '\x7f' || echoData === '\x08') {
            echoData = '\b \b'
          }
          send(echoData)
        }
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }))
        }
      } catch (e) {
        console.error('[Terminal] WS message parse error:', e)
      }
    })

    ws.on('close', () => {
      try { shell.kill() } catch {}
    })

    ws.on('error', (err) => {
      console.error('[Terminal] WS error:', err)
      try { shell.kill() } catch {}
    })
  })

  console.log('[Terminal] WebSocket ready at /terminal')
}
