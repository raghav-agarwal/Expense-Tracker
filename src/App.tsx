import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import Layout from './components/Layout'
import Categories from './pages/Categories'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Transactions from './pages/Transactions'
import Wallets from './pages/Wallets'

export default function App() {
  const { username } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={username ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={username ? <Navigate to="/" replace /> : <Register />} />
      <Route element={username ? <Layout /> : <Navigate to="/login" replace />}>
        <Route path="/" element={<Home />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/wallets" element={<Wallets />} />
        <Route path="/categories" element={<Categories />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
