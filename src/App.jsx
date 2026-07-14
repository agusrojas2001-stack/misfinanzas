import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout/Layout'
import DashboardPage from './pages/DashboardPage'
import RegistrarPage from './pages/RegistrarPage'
import ChatbotPage from './pages/ChatbotPage'
import MetasPage from './pages/MetasPage'
import CuotasPage from './pages/CuotasPage'
import PresupuestoPage from './pages/PresupuestoPage'
import CategoriasPage from './pages/CategoriasPage'
import MovimientosPage from './pages/MovimientosPage'
import AnalisisPage from './pages/AnalisisPage'
import ProfilePage from './pages/ProfilePage'
import MenuPage from './pages/MenuPage'
import LoginPage from './pages/LoginPage'
import RecordatoriosPage from './pages/RecordatoriosPage'
import OnboardingPage from './pages/OnboardingPage'
import DolaresPage from './pages/DolaresPage'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <img
          src="/monedita/monedita-tranqui.svg"
          alt="Cargando..."
          className="w-16 h-16 object-contain animate-bounce"
        />
        <p className="text-sm font-normal text-zinc-500">Cargando tus numeritos...</p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!localStorage.getItem('onboardingDone')) return <Navigate to="/onboarding" replace />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!localStorage.getItem('onboardingDone')) return <Navigate to="/onboarding" replace />
  if (user) return <Navigate to="/" replace />
  return children
}

function OnboardingRoute() {
  const { user } = useAuth()
  if (localStorage.getItem('onboardingDone')) return <Navigate to={user ? '/' : '/login'} replace />
  return <OnboardingPage />
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
      <Route path="/onboarding" element={<OnboardingRoute />} />
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
        <Route path="cuotas" element={<CuotasPage />} />
        <Route path="presupuesto" element={<PresupuestoPage />} />
        <Route path="categorias" element={<CategoriasPage />} />
        <Route path="movimientos" element={<MovimientosPage />} />
        <Route path="analisis" element={<AnalisisPage />} />
        <Route path="perfil" element={<ProfilePage />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="recordatorios" element={<RecordatoriosPage />} />
        <Route path="dolares" element={<DolaresPage />} />
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
