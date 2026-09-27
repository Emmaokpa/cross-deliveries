import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, setToken } from './api.js'
import { useToast } from './components.jsx'

const FEATURES = [
  { icon: 'fa-solid fa-earth-americas', label: 'Global shipment tracking' },
  { icon: 'fa-solid fa-shield-halved', label: 'Role-based access control' },
  { icon: 'fa-solid fa-file-invoice', label: 'Invoices & PDF documents' },
  { icon: 'fa-solid fa-clock-rotate-left', label: 'Full audit trail' },
]

function BrandMark({ size = 'size-11', text = 'text-[13px]' }) {
  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center rounded-2xl bg-primary font-heading ${text} font-bold tracking-wider text-white shadow-lg shadow-primary/40`}
    >
      CBD
    </div>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [needsReset, setNeedsReset] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
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

  const inputClass =
    'w-full rounded-xl border border-[#e4e8f0] bg-white py-3 pl-11 pr-4 text-[15px] text-[#1f2937] transition placeholder:text-[#a7afbd] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10'

  return (
    <div className="min-h-dvh bg-[#f2f4f8] lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* ===== Branding panel (desktop only) ===== */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-navy via-navy to-navy-2 text-white lg:flex lg:flex-col xl:p-14 lg:p-10">
        {/* decorative glows */}
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 top-1/2 size-64 rounded-full bg-white/5 blur-3xl" />

        {/* brand row */}
        <div className="relative flex items-center gap-3">
          <BrandMark size="size-12" />
          <div>
            <p className="font-heading text-lg leading-tight">CrossBorders</p>
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">Deliveries</p>
          </div>
        </div>

        {/* headline + showcase */}
        <div className="relative my-auto py-12">
          <h2 className="font-heading text-4xl font-semibold leading-tight xl:text-[2.75rem]">
            The operations console
            <br />
            for global freight.
          </h2>
          <p className="mt-4 max-w-md leading-relaxed text-white/60">
            Create shipments, track cargo across borders, send invoices and keep a complete audit trail — all in one
            place.
          </p>

          {/* mock live-tracking card */}
          <div className="mt-10 max-w-sm rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="font-heading font-semibold tracking-wider">CBD-10243</span>
              <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-semibold text-gold">In Transit</span>
            </div>
            <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-primary to-[#ff5a63]" />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-white/50">
              <span>Istanbul, TR</span>
              <span className="font-semibold text-white/70">68%</span>
              <span>Lagos, NG</span>
            </div>
          </div>

          {/* feature list */}
          <ul className="mt-10 grid max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-center gap-3 text-sm text-white/75">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[13px] text-gold">
                  <i className={f.icon} aria-hidden="true" />
                </span>
                {f.label}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative flex items-center gap-2 text-xs text-white/40">
          <i className="fa-solid fa-lock text-[10px]" aria-hidden="true" />
          HTTPS secured • All access attempts are logged &amp; audited
        </p>
      </aside>

      {/* ===== Form panel ===== */}
      <main className="flex min-h-dvh flex-col lg:min-h-0">
        {/* mobile brand header */}
        <div className="flex items-center gap-3 border-b border-[#e4e8f0] bg-white px-5 py-4 lg:hidden">
          <BrandMark size="size-10" text="text-xs" />
          <div>
            <p className="font-heading text-base leading-tight text-navy">CrossBorders Admin</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#8a94a6]">Deliveries</p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
          <div className="w-full max-w-md">
            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-3 rounded-xl border border-[#f6c8cc] bg-[#fdecec] px-4 py-3 text-sm text-[#a3040f]"
              >
                <i className="fa-solid fa-circle-exclamation mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {!needsReset ? (
              <form
                onSubmit={submit}
                className="rounded-2xl border border-[#eef1f6] bg-white p-6 shadow-[0_20px_60px_rgba(3,20,53,0.08)] sm:p-8"
              >
                <h1 className="font-heading text-2xl font-semibold text-navy sm:text-[1.75rem]">Welcome back</h1>
                <p className="mt-1.5 text-sm text-[#6b7280]">Sign in to the operations console.</p>

                <div className="mt-7 space-y-4">
                  <div>
                    <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold text-navy">
                      Email address <span className="text-primary">*</span>
                    </label>
                    <div className="relative">
                      <i
                        className="fa-regular fa-envelope pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#a7afbd]"
                        aria-hidden="true"
                      />
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@gmail.com"
                        required
                        autoFocus
                        autoComplete="email"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="mb-1.5 block text-[13px] font-semibold text-navy">
                      Password <span className="text-primary">*</span>
                    </label>
                    <div className="relative">
                      <i
                        className="fa-solid fa-lock pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#a7afbd]"
                        aria-hidden="true"
                      />
                      <input
                        id="password"
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        autoComplete="current-password"
                        className={`${inputClass} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((s) => !s)}
                        aria-label={showPw ? 'Hide password' : 'Show password'}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-[#a7afbd] transition-colors hover:text-navy"
                      >
                        <i className={showPw ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary-dark focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy && <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />}
                  {busy ? 'Signing in…' : 'Sign in'}
                </button>

                <p className="mt-6 text-center text-xs leading-relaxed text-[#9aa3b2]">
                  Operations console for staff. Unauthorized access is logged and prohibited.
                </p>
              </form>
            ) : (
              <form
                onSubmit={doReset}
                className="rounded-2xl border border-[#eef1f6] bg-white p-6 shadow-[0_20px_60px_rgba(3,20,53,0.08)] sm:p-8"
              >
                <h1 className="font-heading text-2xl font-semibold text-navy sm:text-[1.75rem]">Set a new password</h1>
                <p className="mt-1.5 text-sm text-[#6b7280]">For security, update your password before continuing.</p>

                <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#f0dcae] bg-[#fbf1de] px-4 py-3 text-sm text-[#8a5a10]">
                  <i className="fa-solid fa-triangle-exclamation mt-0.5" aria-hidden="true" />
                  <span>Choose a strong password of at least 8 characters.</span>
                </div>

                <div className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="newPassword" className="mb-1.5 block text-[13px] font-semibold text-navy">
                      New password <span className="text-primary">*</span>
                    </label>
                    <div className="relative">
                      <i
                        className="fa-solid fa-key pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#a7afbd]"
                        aria-hidden="true"
                      />
                      <input
                        id="newPassword"
                        type={showPw ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        minLength={8}
                        required
                        autoFocus
                        autoComplete="new-password"
                        className={`${inputClass} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((s) => !s)}
                        aria-label={showPw ? 'Hide passwords' : 'Show passwords'}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-[#a7afbd] transition-colors hover:text-navy"
                      >
                        <i className={showPw ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'} aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="mb-1.5 block text-[13px] font-semibold text-navy">
                      Confirm new password <span className="text-primary">*</span>
                    </label>
                    <div className="relative">
                      <i
                        className="fa-solid fa-key pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#a7afbd]"
                        aria-hidden="true"
                      />
                      <input
                        id="confirmPassword"
                        type={showPw ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        minLength={8}
                        required
                        autoComplete="new-password"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary-dark focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy && <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />}
                  {busy ? 'Saving…' : 'Set new password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
