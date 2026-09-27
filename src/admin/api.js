// Base URL of the API.
// - Local dev: empty (Vite proxy forwards /api to localhost:8787)
// - Production: set VITE_API_URL=https://your-api-domain.com in Vercel env vars
const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const BASE = `${API_ORIGIN}/api`

export function getToken() {
  return localStorage.getItem('cbd_token')
}

export function setToken(token) {
  token ? localStorage.setItem('cbd_token', token) : localStorage.removeItem('cbd_token')
}

export async function api(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = { accept: 'application/json' }
  const token = getToken()
  if (token) headers.authorization = `Bearer ${token}`
  if (body && !isForm) headers['content-type'] = 'application/json'

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body && !isForm ? JSON.stringify(body) : isForm ? body : undefined,
  })

  if (res.status === 401) {
    setToken(null)
    window.dispatchEvent(new Event('cbd:logout'))
    throw new Error('Session expired — please sign in again')
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try {
      const data = await res.json()
      if (data?.error) msg = data.error
    } catch { /* ignore parse errors */ }
    throw new Error(msg)
  }
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/pdf')) return res.blob()
  if (ct.includes('application/json')) return res.json()
  return res.text()
}

export async function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
