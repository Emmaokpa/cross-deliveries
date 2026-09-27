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

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true) // curl / same-origin / server-to-server
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin) || /\.vercel\.app$/.test(new URL(origin).hostname)) {
        return callback(null, true)
      }
      callback(new Error('Not allowed by CORS'))
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
  if (err.message === 'Not allowed by CORS') return res.status(403).json({ error: 'Origin not allowed' })
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
