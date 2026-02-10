import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import AdminLayout from './pages/admin/AdminLayout'
import PlayersPage from './pages/admin/PlayersPage'
import EnterprisesPage from './pages/admin/EnterprisesPage'
import RulesPage from './pages/admin/RulesPage'
import SettingsPage from './pages/admin/SettingsPage'
import PricesPage from './pages/admin/PricesPage'
import GameControlPage from './pages/admin/GameControlPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import MiniApp from './pages/webapp/MiniApp'

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1c2541',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.1)',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="game" replace />} />
          <Route path="players" element={<PlayersPage />} />
          <Route path="enterprises" element={<EnterprisesPage />} />
          <Route path="rules" element={<RulesPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="prices" element={<PricesPage />} />
          <Route path="game" element={<GameControlPage />} />
        </Route>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/app" element={<MiniApp />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  )
}

export default App
