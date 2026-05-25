import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import CreateSurvey from './pages/CreateSurvey'
import SurveyDetail from './pages/SurveyDetail'
import RespondSurvey from './pages/RespondSurvey'
import Analytics from './pages/Analytics'
import EditSurvey from './pages/EditSurvey'
import Admin from './pages/Admin'
import Navbar from './components/Navbar'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" />
}

function AdminRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" />
  if (user.role !== 'admin') return <Navigate to="/" />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/s/:slug" element={<RespondSurvey />} />
          <Route path="/" element={<PrivateRoute><Navbar /><Dashboard /></PrivateRoute>} />
          <Route path="/surveys/new" element={<PrivateRoute><Navbar /><CreateSurvey /></PrivateRoute>} />
          <Route path="/surveys/:id" element={<PrivateRoute><Navbar /><SurveyDetail /></PrivateRoute>} />
          <Route path="/surveys/:id/edit" element={<PrivateRoute><Navbar /><EditSurvey /></PrivateRoute>} />
          <Route path="/surveys/:id/analytics" element={<PrivateRoute><Navbar /><Analytics /></PrivateRoute>} />
          <Route path="/admin" element={<AdminRoute><Navbar /><Admin /></AdminRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
