import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { connectDB } from './db.js'
import authRouter, { adminUsersRouter, authRequired } from './routes/auth.js'
import shipmentsRouter from './routes/shipments.js'
import publicRouter from './routes/public.js'
import auditRouter from './routes/audit.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '1mb' }))

// Minimal security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'same-origin')
  next()
})

// APIs
app.use('/api/auth', authRouter)
app.use('/api/admin', auditRouter)
app.use('/api/admin', adminUsersRouter)
app.use('/api/v1', publicRouter)
app.use('/api/v1', shipmentsRouter)

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'crossborders-api', time: new Date().toISOString() }))

// Serve built frontend (SPA fallback)
const distDir = path.join(__dirname, '..', 'dist')
app.use(express.static(distDir))
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.method !== 'GET') return next()
  res.sendFile(path.join(distDir, 'index.html'))
})

// 404 + error handling
app.use((req, res) => res.status(404).json({ error: 'Not found' }))
app.use((err, req, res, next) => {
  console.error('[server]', err)
  if (res.headersSent) return next(err)
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
