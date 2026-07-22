import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import Layout from './components/Layout'
import Login from './pages/Login'
import AdminLogin from './pages/AdminLogin'
import Dashboard from './pages/Dashboard'
import VolumeBot from './pages/VolumeBot'
import MarketMaker from './pages/MarketMaker'
import ExchangeBot from './pages/ExchangeBot'
import Wallets from './pages/Wallets'
import Orders from './pages/Orders'
import Users from './pages/Users'
import ChangePassword from './pages/ChangePassword'
import ResetPassword from './pages/ResetPassword'

import { setOnUnauthorized } from './api'

function AdminGate({ role, children }) {
  if (role === 'admin') return children
  return null
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const role = localStorage.getItem('role') || ''

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('username')
    setToken(null)
  }, [])

  useEffect(() => {
    setOnUnauthorized(logout)
  }, [logout])

  const handleLogin = useCallback((newToken) => {
    localStorage.setItem('token', newToken)
    setToken(newToken)
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout onLogout={logout} role={role} />}>
          <Route path="/" element={token ? <Navigate to="/market-maker" /> : <Login onLogin={handleLogin} />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/admin" element={role === 'admin' ? <Users /> : <AdminLogin onLogin={handleLogin} />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          {token && (
            <>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/volume" element={<AdminGate role={role}><VolumeBot /></AdminGate>} />
              <Route path="/market-maker" element={<AdminGate role={role}><MarketMaker /></AdminGate>} />
              <Route path="/exchange" element={<AdminGate role={role}><ExchangeBot /></AdminGate>} />
              <Route path="/wallets" element={<AdminGate role={role}><Wallets /></AdminGate>} />
              <Route path="/orders" element={<AdminGate role={role}><Orders /></AdminGate>} />
              <Route path="/change-password" element={<AdminGate role={role}><ChangePassword /></AdminGate>} />
            </>
          )}
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
