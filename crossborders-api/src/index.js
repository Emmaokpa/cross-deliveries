import express from 'express'
import cors from 'cors'
import { connectDB } from './db.js'
import authRouter, { adminUsersRouter } from './routes/auth.js'
import shipmentsRouter from './routes/shipments.js'
import publicRouter from './routes/public.js'
import auditRouter from './routes/audit.js'

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1)
app.use(express.json({ limit: '1mb' }))

// Minimal security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'same-origin')
  next()
})

// CORS — allow your Vercel frontend (comma-separated origins)
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

// Local dev convenience: always allow loopback origins regardless of port
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

// Private/LAN hosts (e.g. Vite's "Network" URL) — allowed outside production
const IS_PROD = process.env.NODE_ENV === 'production'
const PRIVATE_IPV4 = /^(10\.|127\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/

function isAllowedOrigin(origin) {
  let hostname
  try {
    hostname = new URL(origin).hostname
  } catch {
    return false
  }
  if (LOCAL_HOSTS.has(hostname)) return true
  if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return true
  if (/\.vercel\.app$/.test(hostname)) return true
  // Google Cloud Shell / Codespaces-style web previews (dev only)
  if (!IS_PROD && hostname.endsWith('.cloudshell.dev')) return true
  if (!IS_PROD && (PRIVATE_IPV4.test(hostname) || hostname.endsWith('.local'))) return true
  return false
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true) // curl / same-origin / server-to-server
      if (isAllowedOrigin(origin)) return callback(null, true)
      console.warn(`[server] CORS: rejected origin ${origin}`)
      callback(new Error(`Not allowed by CORS: ${origin}`))
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
)

// APIs
app.use('/api/auth', authRouter)
app.use('/api/admin', auditRouter)
app.use('/api/admin', adminUsersRouter)
app.use('/api/v1', publicRouter)
app.use('/api/v1', shipmentsRouter)

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'crossborders-api', time: new Date().toISOString() }))

// 404 + error handling
app.use((req, res) => res.status(404).json({ error: 'Not found' }))
app.use((err, req, res, next) => {
  console.error('[server]', err)
  if (res.headersSent) return next(err)
  if (err.message.startsWith('Not allowed by CORS')) return res.status(403).json({ error: 'Origin not allowed' })
  res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 8787

connectDB()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[server] CrossBorders API running on http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    console.error('[server] MongoDB connection failed:', err.message)
    process.exit(1)
  })
