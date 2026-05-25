import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const handleLogout = () => { logout(); navigate('/login') }
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">Microencuestas</Link>
      <div className="navbar-right">
        {user?.role === 'admin' && <Link to="/admin" className="btn btn-sm">Admin</Link>}
        <span style={{ color: 'var(--text2)', fontSize: 13 }}>{user?.email}</span>
        <button className="btn btn-sm" onClick={handleLogout}>Salir</button>
      </div>
    </nav>
  )
}
