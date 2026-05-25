import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { api } from '../utils/api'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres')
    setLoading(true)
    try {
      const data = await api('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) })
      login(data.user, data.token)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg2)' }}>
      <div style={{ width: '100%', maxWidth: 380, padding: '0 1rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Microencuestas</h1>
          <p style={{ color: 'var(--text2)', marginTop: 4, fontSize: 13 }}>Crea tu cuenta gratis</p>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="label">Correo electrónico</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="field">
              <label className="label">Contraseña</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <p className="error-msg" style={{ marginBottom: 12 }}>{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? <span className="spinner" /> : 'Crear cuenta'}
            </button>
          </form>
        </div>
        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: 13, color: 'var(--text2)' }}>
          ¿Ya tienes cuenta? <Link to="/login" style={{ color: 'var(--text)', fontWeight: 500 }}>Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}
