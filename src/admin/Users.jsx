import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { api } from './api.js'
import { Badge, Field, Modal, fmtDate, useToast } from './components.jsx'

export default function Users() {
  const { admin: me } = useOutletContext()
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [modal, setModal] = useState(null) // {mode:'create'} | {mode:'edit', user} | {mode:'reset', user}
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'admin' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => {
    api('/admin/users')
      .then((d) => setUsers(d.users))
      .catch((e) => toast(e.message, 'err'))
  }
  useEffect(load, [])

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (modal.mode === 'create') {
        await api('/admin/users', { method: 'POST', body: form })
        toast(`Admin ${form.email} created — they must reset their password at first login.`, 'ok')
      } else if (modal.mode === 'edit') {
        await api(`/admin/users/${modal.user.id}`, {
          method: 'PATCH',
          body: { name: form.name, role: form.role },
        })
        toast('Account updated.', 'ok')
      } else if (modal.mode === 'reset') {
        await api(`/admin/users/${modal.user.id}`, { method: 'PATCH', body: { password: form.password } })
        toast(`Password reset for ${modal.user.email} — forced change at next login.`, 'ok')
      }
      setModal(null)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = async (u) => {
    try {
      await api(`/admin/users/${u.id}`, { method: 'PATCH', body: { active: !u.active } })
      toast(`${u.email} ${u.active ? 'deactivated' : 'reactivated'}.`, 'ok')
      load()
    } catch (err) {
      toast(err.message, 'err')
    }
  }

  const openCreate = () => {
    setForm({ name: '', email: '', password: '', role: 'admin' })
    setModal({ mode: 'create' })
  }

  const openEdit = (u) => {
    setForm({ name: u.name, email: u.email, password: '', role: u.role })
    setModal({ mode: 'edit', user: u })
  }

  const openReset = (u) => {
    setForm({ name: u.name, email: u.email, password: '', role: u.role })
    setModal({ mode: 'reset', user: u })
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h3>Staff Accounts</h3>
          <div className="sub">Create operator accounts, reset access, and manage roles.</div>
        </div>
        <button className="btn-a btn-primary-a" onClick={openCreate}>＋ New Admin</button>
      </div>

      <div className="a-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Must reset PW</th><th>Created</th><th style={{ width: 240 }}>Actions</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.name}{u.id === me.id && <span style={{ color: '#6b7280' }}> (you)</span>}</td>
                  <td>{u.email}</td>
                  <td><Badge value={u.role} /></td>
                  <td><Badge value={u.active ? 'active' : 'inactive'} /></td>
                  <td>{u.must_reset_password ? '⚠ Yes' : '—'}</td>
                  <td style={{ fontSize: 12.5, color: '#6b7280' }}>{fmtDate(u.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn-a btn-ghost-a btn-sm-a" onClick={() => openEdit(u)}>Edit</button>
                      <button className="btn-a btn-ghost-a btn-sm-a" onClick={() => openReset(u)}>Reset PW</button>
                      {u.id !== me.id && (
                        <button className={`btn-a btn-sm-a ${u.active ? 'btn-danger-a' : 'btn-navy-a'}`} onClick={() => toggleActive(u)}>
                          {u.active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal
          title={modal.mode === 'create' ? 'Create Admin Account' : modal.mode === 'edit' ? `Edit ${modal.user.name}` : `Reset Password — ${modal.user.email}`}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn-a btn-ghost-a" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-a btn-primary-a" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            </>
          }
        >
          {error && <div className="alert-a alert-error">{error}</div>}
          <form onSubmit={save}>
            {modal.mode !== 'reset' && (
              <>
                <Field label="Full name" required><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></Field>
                {modal.mode === 'create' && <Field label="Email" required><input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required /></Field>}
                <Field label="Role">
                  <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                    <option value="admin">Admin (operations)</option>
                    <option value="super_admin">Super Admin (full control)</option>
                  </select>
                </Field>
              </>
            )}
            {(modal.mode === 'create' || modal.mode === 'reset') && (
              <Field label={modal.mode === 'create' ? 'Initial password' : 'New temporary password'} required>
                <input type="text" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} minLength={8} placeholder="min 8 characters" required />
              </Field>
            )}
            {modal.mode === 'reset' && <div className="alert-a alert-warn">The staff member will be forced to set a new password at their next login.</div>}
          </form>
        </Modal>
      )}
    </>
  )
}
