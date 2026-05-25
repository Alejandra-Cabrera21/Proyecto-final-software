import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { api } from '../utils/api'

export default function Admin() {
  const { token } = useAuth()
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [surveys, setSurveys] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api('/admin/users', {}, token),
      api('/admin/surveys', {}, token),
      api('/admin/audit', {}, token)
    ]).then(([u, s, l]) => { setUsers(u); setSurveys(s); setLogs(l) })
      .catch(console.error).finally(() => setLoading(false))
  }, [token])

  const toggleUser = async (id) => {
    try {
      const updated = await api(`/admin/users/${id}/toggle`, { method: 'PATCH' }, token)
      setUsers(u => u.map(x => x.id === id ? { ...x, isActive: updated.isActive } : x))
    } catch (err) { alert(err.message) }
  }

  if (loading) return <div className="page"><div className="spinner" /></div>

  return (
    <div className="page">
      <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: '1.5rem' }}>Panel de administración</h1>

      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {[['users', `Usuarios (${users.length})`], ['surveys', `Encuestas (${surveys.length})`], ['logs', 'Log de auditoría']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ padding: '8px 16px', border: 'none', background: 'transparent', fontWeight: tab === key ? 600 : 400, borderBottom: tab === key ? '2px solid var(--accent)' : '2px solid transparent', cursor: 'pointer', fontSize: 14 }}>{label}</button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead><tr><th>Email</th><th>Rol</th><th>Estado</th><th>Registrado</th><th>Acción</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                  <td><span className={`badge ${u.isActive ? 'badge-published' : 'badge-closed'}`}>{u.isActive ? 'Activo' : 'Suspendido'}</span></td>
                  <td style={{ color: 'var(--text2)' }}>{new Date(u.createdAt).toLocaleDateString('es-GT')}</td>
                  <td>
                    <button className="btn btn-sm" onClick={() => toggleUser(u.id)}>
                      {u.isActive ? 'Suspender' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'surveys' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead><tr><th>Título</th><th>Creador</th><th>Estado</th><th>Respuestas</th><th>Creada</th></tr></thead>
            <tbody>
              {surveys.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>{s.title}</td>
                  <td style={{ color: 'var(--text2)' }}>{s.user?.email}</td>
                  <td><span className={`badge badge-${s.status}`}>{s.status}</span></td>
                  <td>{s._count?.responses ?? 0}</td>
                  <td style={{ color: 'var(--text2)' }}>{new Date(s.createdAt).toLocaleDateString('es-GT')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'logs' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th></tr></thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td style={{ color: 'var(--text2)', whiteSpace: 'nowrap' }}>{new Date(l.createdAt).toLocaleString('es-GT')}</td>
                  <td style={{ color: 'var(--text2)' }}>{l.user?.email || '—'}</td>
                  <td><code style={{ fontSize: 12, background: 'var(--bg2)', padding: '2px 6px', borderRadius: 4 }}>{l.action}</code></td>
                  <td style={{ color: 'var(--text3)', fontSize: 12 }}>{l.entity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
