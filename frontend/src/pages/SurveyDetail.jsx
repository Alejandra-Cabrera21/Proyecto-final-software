import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { api } from '../utils/api'

const statusLabel = { draft: 'Borrador', published: 'Publicada', paused: 'Pausada', closed: 'Cerrada' }

export default function SurveyDetail() {
  const { id } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [survey, setSurvey] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api(`/surveys/${id}`, {}, token).then(setSurvey).catch(console.error).finally(() => setLoading(false))
  }, [id, token])

  if (loading) return <div className="page"><div className="spinner" /></div>
  if (!survey) return <div className="page"><p>Encuesta no encontrada.</p></div>

  const publicUrl = `${window.location.origin}/s/${survey.slug}`

  return (
    <div className="page" style={{ maxWidth: 680 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
        <button className="btn btn-sm" onClick={() => navigate('/')}>← Volver</button>
        <h1 style={{ fontSize: 18, fontWeight: 600, flex: 1 }}>{survey.title}</h1>
        <span className={`badge badge-${survey.status}`}>{statusLabel[survey.status]}</span>
      </div>

      {survey.status === 'published' && (
        <div className="card" style={{ marginBottom: 16, background: 'var(--bg2)' }}>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Enlace público</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <code style={{ flex: 1, fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{publicUrl}</code>
            <button className="btn btn-sm" onClick={() => { navigator.clipboard.writeText(publicUrl); alert('Copiado') }}>Copiar</button>
          </div>
        </div>
      )}

      <div className="card">
        {survey.description && <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 16 }}>{survey.description}</p>}
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Preguntas ({survey.questions.length})</h2>
        {survey.questions.map((q, i) => (
          <div key={q.id} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontWeight: 500, marginBottom: 4 }}>{i + 1}. {q.text}</p>
            <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--bg3)', padding: '2px 8px', borderRadius: 20 }}>{q.type}</span>
            {q.options && Array.isArray(q.options) && (
              <ul style={{ marginTop: 8, paddingLeft: 16 }}>
                {q.options.map((o, oi) => <li key={oi} style={{ fontSize: 13, color: 'var(--text2)' }}>{o}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
