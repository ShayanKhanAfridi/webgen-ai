import 'dotenv/config'
import { createServer } from 'http'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import authRoutes from './routes/auth.js'
import projectRoutes from './routes/projects.js'
import aiRoutes from './routes/ai.js'
import { setupTerminal } from './terminal.js'

const app = express()
const PORT = process.env.PORT || 5000

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.CLIENT_URL,
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like server-to-server, curl) or matched origins
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true)
    }
    return callback(null, true)
  },
  credentials: true,
  exposedHeaders: ['Content-Disposition']
}))
app.use(cookieParser())
app.use(express.json({ limit: '50mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/ai', aiRoutes)

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'WebGen AI Backend',
    version: '1.0.0',
    message: 'Backend is up and running! 🚀'
  })
})

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

// Create HTTP server (required for WebSocket upgrade)
const server = createServer(app)

// Attach WebSocket terminal
setupTerminal(server)

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
