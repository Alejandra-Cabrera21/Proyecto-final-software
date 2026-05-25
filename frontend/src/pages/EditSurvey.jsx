import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { api } from '../utils/api'

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Opción múltiple' },
  { value: 'short_text', label: 'Respuesta corta' },
  { value: 'likert', label: 'Escala Likert (1-5)' }
]

export default function EditSurvey() {
  const { id } = useParams()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [closesAt, setClosesAt] = useState('')
  const [questions, setQuestions] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    api(`/surveys/${id}`, {}, token).then(survey => {
      setTitle(survey.title)
      setDescription(survey.description || '')
      setClosesAt(survey.closesAt ? survey.closesAt.slice(0, 16) : '')
      setQuestions(survey.questions.map(q => ({
        text: q.text,
        type: q.type,
        options: Array.isArray(q.options) ? q.options : (q.options ? q.options : (q.type === 'multiple_choice' ? ['', ''] : null))
      })))
    }).catch(() => setError('No se pudo cargar la encuesta')).finally(() => setFetching(false))
  }, [id, token])

  const addQuestion = () => setQuestions([...questions, { text: '', type: 'multiple_choice', options: ['', ''] }])

  const updateQuestion = (i, field, value) => {
    const updated = [...questions]
    updated[i] = { ...updated[i], [field]: value }
    if (field === 'type' && value === 'likert') updated[i].options = null
    if (field === 'type' && value === 'short_text') updated[i].options = null
    if (field === 'type' && value === 'multiple_choice') updated[i].options = ['', '']
    setQuestions(updated)
  }

  const updateOption = (qi, oi, value) => {
    const updated = [...questions]
    const opts = [...(updated[qi].options || [])]
    opts[oi] = value
    updated[qi] = { ...updated[qi], options: opts }
    setQuestions(updated)
  }

  const addOption = (qi) => {
    const updated = [...questions]
    updated[qi] = { ...updated[qi], options: [...(updated[qi].options || []), ''] }
    setQuestions(updated)
  }

  const removeQuestion = (i) => setQuestions(questions.filter((_, idx) => idx !== i))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!title.trim()) return setError('El título es requerido')
    if (questions.some(q => !q.text.trim())) return setError('Todas las preguntas deben tener texto')
    setLoading(true)
    try {
      await api(`/surveys/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title, description, closesAt: closesAt || null,
          questions: questions.map(q => ({
            text: q.text, type: q.type,
            options: q.options?.filter(o => o.trim()) || null
          }))
        })
      }, token)
      navigate('/')
    } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  if (fetching) return <div className="page"><div className="spinner" /></div>

  return (
    <div className="page" style={{ maxWidth: 680 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
        <button className="btn btn-sm" onClick={() => navigate('/')}>← Volver</button>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>Editar encuesta</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="field">
            <label className="label">Título *</label>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Título de la encuesta" required />
          </div>
          <div className="field">
            <label className="label">Descripción</label>
            <textarea className="input" value={description} onChange={e => setDescription(e.target.value)} rows={2} style={{ resize: 'vertical' }} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label">Fecha de cierre (opcional)</label>
            <input className="input" type="datetime-local" value={closesAt} onChange={e => setClosesAt(e.target.value)} />
          </div>
        </div>

        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Preguntas</h2>

        {questions.map((q, i) => (
          <div key={i} className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--text2)' }}>Pregunta {i + 1}</span>
              {questions.length > 1 && (
                <button type="button" className="btn btn-sm" onClick={() => removeQuestion(i)} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>Eliminar</button>
              )}
            </div>
            <div className="field">
              <label className="label">Texto</label>
              <input className="input" value={q.text} onChange={e => updateQuestion(i, 'text', e.target.value)} placeholder="Escribe la pregunta" />
            </div>
            <div className="field" style={{ marginBottom: q.type === 'multiple_choice' ? 12 : 0 }}>
              <label className="label">Tipo</label>
              <select className="input" value={q.type} onChange={e => updateQuestion(i, 'type', e.target.value)}>
                {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            {q.type === 'multiple_choice' && (
              <div>
                <label className="label">Opciones</label>
                {(q.options || []).map((opt, oi) => (
                  <div key={oi} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <input className="input" value={opt} onChange={e => updateOption(i, oi, e.target.value)} placeholder={`Opción ${oi + 1}`} />
                    {(q.options || []).length > 2 && (
                      <button type="button" className="btn btn-sm" onClick={() => {
                        const updated = [...questions]
                        updated[i].options = updated[i].options.filter((_, idx) => idx !== oi)
                        setQuestions(updated)
                      }}>×</button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-sm" onClick={() => addOption(i)}>+ Agregar opción</button>
              </div>
            )}
            {q.type === 'likert' && <p style={{ fontSize: 12, color: 'var(--text2)' }}>Escala del 1 (muy malo) al 5 (excelente)</p>}
          </div>
        ))}

        <button type="button" className="btn" onClick={addQuestion} style={{ marginBottom: 16, width: '100%', justifyContent: 'center', borderStyle: 'dashed' }}>+ Agregar pregunta</button>

        {error && <p className="error-msg" style={{ marginBottom: 12 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={() => navigate('/')}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
