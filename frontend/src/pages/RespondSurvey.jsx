import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../utils/api'

function getFingerprint() {
  const key = 'menc_fp'
  let fp = localStorage.getItem(key)
  if (!fp) { fp = Math.random().toString(36).slice(2) + Date.now(); localStorage.setItem(key, fp) }
  return fp
}

export default function RespondSurvey() {
  const { slug } = useParams()
  const [survey, setSurvey] = useState(null)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api(`/surveys/public/${slug}`).then(s => { setSurvey(s); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [slug])

  const setAnswer = (questionId, value) => setAnswers(a => ({ ...a, [questionId]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const unanswered = survey.questions.filter(q => !answers[q.id])
    if (unanswered.length > 0) return setError('Por favor responde todas las preguntas')
    setError('')
    setSubmitting(true)
    try {
      await api(`/responses/${slug}`, {
        method: 'POST',
        body: JSON.stringify({
          answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value })),
          deviceFingerprint: getFingerprint()
        })
      })
      setSubmitted(true)
    } catch (err) { setError(err.message) } finally { setSubmitting(false) }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>
  if (error && !survey) return <div className="page-narrow"><div className="card" style={{ textAlign: 'center', color: 'var(--text2)' }}><p>{error}</p></div></div>

  if (submitted) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg2)' }}>
      <div className="card" style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>¡Respuesta registrada!</h2>
        <p style={{ color: 'var(--text2)', fontSize: 13 }}>Gracias por completar la encuesta.</p>
      </div>
    </div>
  )

  const answered = Object.keys(answers).length
  const total = survey?.questions.length || 0
  const progress = total > 0 ? (answered / total) * 100 : 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg2)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 580, margin: '0 auto' }}>
        <div className="card" style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>{survey.title}</h1>
          {survey.description && <p style={{ color: 'var(--text2)', fontSize: 13 }}>{survey.description}</p>}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>
            <span>{answered} de {total} preguntas</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
        </div>

        <form onSubmit={handleSubmit}>
          {survey.questions.map((q, i) => (
            <div key={q.id} className="card" style={{ marginBottom: 12 }}>
              <p style={{ fontWeight: 500, marginBottom: 12 }}>{i + 1}. {q.text}</p>
              {q.type === 'multiple_choice' && (q.options || []).map((opt, oi) => (
                <label key={oi} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', border: '1px solid', borderColor: answers[q.id] === opt ? 'var(--accent)' : 'var(--border)', borderRadius: 'var(--radius)', marginBottom: 6, cursor: 'pointer', background: answers[q.id] === opt ? 'var(--bg2)' : 'transparent' }}>
                  <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt} onChange={() => setAnswer(q.id, opt)} style={{ accentColor: 'var(--accent)' }} />
                  <span style={{ fontSize: 13 }}>{opt}</span>
                </label>
              ))}
              {q.type === 'likert' && (
                <div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} type="button" onClick={() => setAnswer(q.id, String(n))}
                        style={{ flex: 1, padding: '10px 0', border: '1px solid', borderColor: answers[q.id] === String(n) ? 'var(--accent)' : 'var(--border)', borderRadius: 'var(--radius)', background: answers[q.id] === String(n) ? 'var(--accent)' : 'transparent', color: answers[q.id] === String(n) ? 'white' : 'var(--text)', fontWeight: 500 }}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                    <span>Muy malo</span><span>Excelente</span>
                  </div>
                </div>
              )}
              {q.type === 'short_text' && (
                <textarea className="input" rows={2} value={answers[q.id] || ''} onChange={e => setAnswer(q.id, e.target.value)} placeholder="Escribe tu respuesta aquí..." style={{ resize: 'vertical' }} />
              )}
            </div>
          ))}

          {error && <p className="error-msg" style={{ marginBottom: 12 }}>{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
            {submitting ? <span className="spinner" /> : 'Enviar respuestas'}
          </button>
        </form>
      </div>
    </div>
  )
}
