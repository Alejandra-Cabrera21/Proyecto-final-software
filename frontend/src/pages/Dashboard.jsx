import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { api } from '../utils/api'

const statusLabel = { draft: 'Borrador', published: 'Publicada', paused: 'Pausada', closed: 'Cerrada' }

export default function Dashboard() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [surveys, setSurveys] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/surveys', {}, token).then(setSurveys).catch(console.error).finally(() => setLoading(false))
  }, [token])

  const changeStatus = async (id, status) => {
    try {
      const updated = await api(`/surveys/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, token)
      setSurveys(s => s.map(x => x.id === id ? { ...x, status: updated.status } : x))
    } catch (err) { alert(err.message) }
  }

  const duplicate = async (id) => {
    try {
      const copy = await api(`/surveys/${id}/duplicate`, { method: 'POST' }, token)
      setSurveys(s => [copy, ...s])
    } catch (err) { alert(err.message) }
  }

  const remove = async (id) => {
    try {
      await api(`/surveys/${id}`, { method: 'DELETE' }, token)
      setSurveys(s => s.filter(x => x.id !== id))
    } catch (err) { alert(err.message) }
  }

  if (loading) return <div className="page"><div className="spinner" /></div>

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>Mis encuestas</h1>
        <Link to="/surveys/new" className="btn btn-primary">+ Nueva encuesta</Link>
      </div>

      {surveys.length === 0 ? (
        <div className="empty">
          <p style={{ marginBottom: 12 }}>Aún no tienes encuestas.</p>
          <Link to="/surveys/new" className="btn btn-primary">Crear primera encuesta</Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Título</th>
                <th>Estado</th>
                <th>Respuestas</th>
                <th>Creada</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {surveys.map(s => (
                <tr key={s.id}>
                  <td><Link to={`/surveys/${s.id}`} style={{ fontWeight: 500 }}>{s.title}</Link></td>
                  <td><span className={`badge badge-${s.status}`}>{statusLabel[s.status]}</span></td>
                  <td>{s._count?.responses ?? 0}</td>
                  <td style={{ color: 'var(--text2)' }}>{new Date(s.createdAt).toLocaleDateString('es-GT')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {s.status === 'draft' && <button className="btn btn-sm" onClick={() => navigate(`/surveys/${s.id}/edit`)}>Editar</button>}
                      {s.status === 'draft' && <button className="btn btn-sm" onClick={() => changeStatus(s.id, 'published')}>Publicar</button>}
                      {s.status === 'published' && <button className="btn btn-sm" onClick={() => changeStatus(s.id, 'paused')}>Pausar</button>}
                      {s.status === 'paused' && <button className="btn btn-sm" onClick={() => changeStatus(s.id, 'published')}>Reanudar</button>}
                      {s.status === 'published' && <button className="btn btn-sm" onClick={() => changeStatus(s.id, 'closed')}>Cerrar</button>}
                      {s._count?.responses > 0 && <button className="btn btn-sm" onClick={() => navigate(`/surveys/${s.id}/analytics`)}>Ver resultados</button>}
                      <button className="btn btn-sm" onClick={() => duplicate(s.id)}>Duplicar</button>
                      <button className="btn btn-sm" onClick={() => remove(s.id)} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>Eliminar</button>
                      {s.status === 'published' && (
                        <button className="btn btn-sm" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/s/${s.slug}`); alert('Enlace copiado') }}>
                          Copiar enlace
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
