import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { api } from '../utils/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function Analytics() {
  const { id } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api(`/analytics/${id}`, {}, token).then(setData).catch(console.error).finally(() => setLoading(false))
  }, [id, token])

  if (loading) return <div className="page"><div className="spinner" /></div>
  if (!data) return <div className="page"><p>Error al cargar resultados.</p></div>

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
        <button className="btn btn-sm" onClick={() => navigate('/')}>← Volver</button>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>Resultados</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total respuestas', value: data.totalResponses },
          { label: 'Tasa de completitud', value: `${data.completionRate}%` },
          { label: 'Preguntas', value: data.questionStats.length }
        ].map(m => (
          <div key={m.label} style={{ background: 'var(--bg2)', borderRadius: 'var(--radius)', padding: '1rem' }}>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{m.label}</p>
            <p style={{ fontSize: 24, fontWeight: 600 }}>{m.value}</p>
          </div>
        ))}
      </div>

      {data.questionStats.map((q, i) => (
        <div key={q.questionId} className="card" style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 500, marginBottom: 4 }}>{i + 1}. {q.text}</p>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>{q.total} respuesta{q.total !== 1 ? 's' : ''}</p>

          {(q.type === 'multiple_choice' || q.type === 'likert') && q.counts && (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={Object.entries(q.counts).map(([name, count]) => ({ name, count, pct: Math.round(count / q.total * 100) }))}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v, n, p) => [`${v} (${p.payload.pct}%)`, 'Respuestas']} />
                <Bar dataKey="count" fill="#111111" radius={[4, 4, 0, 0]}>
                  {Object.keys(q.counts).map((_, idx) => <Cell key={idx} fill={idx % 2 === 0 ? '#111' : '#555'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {q.type === 'short_text' && (
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {(q.answers || []).map((a, idx) => (
                <div key={idx} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text2)' }}>{a}</div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
