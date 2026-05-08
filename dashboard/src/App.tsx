import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Tema from './pages/Tema'
import Alertas from './pages/Alertas'
import Usuarios from './pages/admin/Usuarios'
import Configuracion from './pages/admin/Configuracion'
import Layout from './components/Layout'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }
  
  return user ? <>{children}</> : <Navigate to="/login" />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="tema/:tema" element={<Tema />} />
        <Route path="alertas" element={<Alertas />} />
        <Route path="admin/usuarios" element={<Usuarios />} />
        <Route path="admin/configuracion" element={<Configuracion />} />
      </Route>
    </Routes>
  )
}

export default App
