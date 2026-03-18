import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAppStore from './store/useAppStore'
import LoginPage from './pages/LoginPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import POSearchPage from './pages/POSearchPage'
import CapturePage from './pages/CapturePage'
import ReviewPage from './pages/ReviewPage'
import ConfirmPage from './pages/ConfirmPage'

function PrivateRoute({ children }) {
  const { credentials } = useAppStore()
  return credentials ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-navy-900 text-slate-100 max-w-lg mx-auto">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/po-search" element={<PrivateRoute><POSearchPage /></PrivateRoute>} />
          <Route path="/capture" element={<PrivateRoute><CapturePage /></PrivateRoute>} />
          <Route path="/review" element={<PrivateRoute><ReviewPage /></PrivateRoute>} />
          <Route path="/confirm" element={<PrivateRoute><ConfirmPage /></PrivateRoute>} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
