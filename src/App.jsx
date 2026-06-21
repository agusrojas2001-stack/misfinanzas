import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout/Layout'
import DashboardPage from './pages/DashboardPage'
import RegistrarPage from './pages/RegistrarPage'
import ChatbotPage from './pages/ChatbotPage'
import MetasPage from './pages/MetasPage'
import PresupuestoPage from './pages/PresupuestoPage'
import CategoriasPage from './pages/CategoriasPage'
import MovimientosPage from './pages/MovimientosPage'
import AnalisisPage from './pages/AnalisisPage'
import ProfilePage from './pages/ProfilePage'
import MenuPage from './pages/MenuPage'
import LoginPage from './pages/LoginPage'
import RecordatoriosPage from './pages/RecordatoriosPage'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-bounce">💸</div>
        <p className="text-zinc-500 text-sm">Cargando...</p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="registrar" element={<RegistrarPage />} />
        <Route path="chatbot" element={<ChatbotPage />} />
        <Route path="metas" element={<MetasPage />} />
        <Route path="presupuesto" element={<PresupuestoPage />} />
        <Route path="categorias" element={<CategoriasPage />} />
        <Route path="movimientos" element={<MovimientosPage />} />
        <Route path="analisis" element={<AnalisisPage />} />
        <Route path="perfil" element={<ProfilePage />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="recordatorios" element={<RecordatoriosPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
