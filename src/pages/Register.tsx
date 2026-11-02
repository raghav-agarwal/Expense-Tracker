import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import PinPad from '../components/PinPad'

const WEAK = ['000000', '111111', '123456', '654321']

export default function Register() {
  const { register } = useAuth()
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [step, setStep] = useState<'pin' | 'confirm'>('pin')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const onPin = (v: string) => {
    setPin(v); setError('')
    if (v.length === 6) {
      if (WEAK.includes(v)) { setError('PIN too easy to guess'); setPin(''); return }
      setStep('confirm')
    }
  }

  const onConfirm = async (v: string) => {
    setConfirm(v); setError('')
    if (v.length === 6) {
      if (v !== pin) { setError('PINs do not match'); setConfirm(''); setPin(''); setStep('pin'); return }
      setBusy(true)
      try { await register(username, pin) }
      catch (e) { setError((e as Error).message); setConfirm(''); setPin(''); setStep('pin') }
      finally { setBusy(false) }
    }
  }

  return (
    <div className="min-h-full flex flex-col justify-center p-6 gap-6">
      <h1 className="text-2xl font-semibold text-center">Create account</h1>
      <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Choose a username"
        autoCapitalize="none" autoCorrect="off" disabled={step === 'confirm'}
        className="w-full max-w-xs mx-auto rounded-xl bg-slate-800 px-4 py-3 outline-none focus:ring-2 ring-emerald-400 disabled:opacity-60" />
      <p className="text-center text-sm text-slate-400">
        {step === 'pin' ? 'Set a 6-digit PIN' : 'Confirm your PIN'}
      </p>
      {step === 'pin'
        ? <PinPad value={pin} onChange={onPin} disabled={busy || !username.trim()} />
        : <PinPad value={confirm} onChange={onConfirm} disabled={busy} />}
      <p className="h-5 text-center text-sm text-red-400">{error}</p>
      <p className="text-center text-sm text-slate-400">
        Have an account? <Link to="/login" className="text-emerald-400">Log in</Link>
      </p>
    </div>
  )
}
