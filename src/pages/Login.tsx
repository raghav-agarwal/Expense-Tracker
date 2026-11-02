import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import PinPad from '../components/PinPad'

export default function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const change = async (v: string) => {
    setPin(v)
    setError('')
    if (v.length === 6) {
      if (!username.trim()) { setError('Enter username'); setPin(''); return }
      setBusy(true)
      try { await login(username, v) }
      catch (e) { setError((e as Error).message); setPin('') }
      finally { setBusy(false) }
    }
  }

  return (
    <div className="min-h-full flex flex-col justify-center p-6 gap-6">
      <h1 className="text-2xl font-semibold text-center">Welcome back</h1>
      <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username"
        autoCapitalize="none" autoCorrect="off"
        className="w-full max-w-xs mx-auto rounded-xl bg-slate-800 px-4 py-3 outline-none focus:ring-2 ring-emerald-400" />
      <p className="text-center text-sm text-slate-400">Enter your 6-digit PIN</p>
      <PinPad value={pin} onChange={change} disabled={busy} />
      <p className="h-5 text-center text-sm text-red-400">{error}</p>
      <p className="text-center text-sm text-slate-400">
        New here? <Link to="/register" className="text-emerald-400">Create account</Link>
      </p>
    </div>
  )
}
