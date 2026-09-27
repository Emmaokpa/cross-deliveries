import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, setToken } from './api.js'
import { Field, useToast } from './components.jsx'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [needsReset, setNeedsReset] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const navigate = useNavigate()
  const toast = useToast()

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const data = await api('/auth/login', { method: 'POST', body: { email, password } })
      setToken(data.token)
      if (data.admin.must_reset_password) {
        setNeedsReset(true)
        toast('Welcome! Please set a new password to continue.', 'ok')
      } else {
        navigate('/admin')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const doReset = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) return setError('New passwords do not match')
    if (newPassword.length < 8) return setError('New password must be at least 8 characters')
    setBusy(true)
    setError('')
    try {
      await api('/auth/change-password', { method: 'POST', body: { current_password: password, new_password: newPassword } })
      toast('Password updated — welcome aboard!', 'ok')
      navigate('/admin')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-root">
      <div className="admin-login">
        <div className="login-card">
          <div className="login-brand">
            <div className="brand-mark">CBD</div>
            <h1>CrossBorders Admin</h1>
          </div>
          <p className="login-sub">Operations console for staff. Unauthorized access is logged and prohibited.</p>

          {error && <div className="alert-a alert-error">{error}</div>}

          {!needsReset ? (
            <form onSubmit={submit}>
              <Field label="Email address" required>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@gmail.com" required autoFocus />
              </Field>
              <Field label="Password" required>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
              </Field>
              <button className="btn-a btn-primary-a" style={{ width: '100%' }} disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form onSubmit={doReset}>
              <div className="alert-a alert-warn">For security, you must set a new password before using the console.</div>
              <Field label="New password" required>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required autoFocus />
              </Field>
              <Field label="Confirm new password" required>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} required />
              </Field>
              <button className="btn-a btn-primary-a" style={{ width: '100%' }} disabled={busy}>
                {busy ? 'Saving…' : 'Set new password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
