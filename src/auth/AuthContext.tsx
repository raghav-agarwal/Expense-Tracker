import { createContext, useContext, useState, type ReactNode } from 'react'
import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { hashPin, randomSalt } from '../lib/crypto'
import { clearSession, loadSession, saveSession } from '../lib/session'

const USERNAME_RE = /^[a-z0-9_]{3,20}$/

interface AuthCtx {
  username: string | null
  login: (username: string, pin: string) => Promise<void>
  register: (username: string, pin: string) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AuthCtx>(null!)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(() => loadSession())

  const login = async (rawName: string, pin: string) => {
    const name = rawName.trim().toLowerCase()
    const snap = await getDoc(doc(db, 'users', name))
    if (!snap.exists()) throw new Error('Invalid username or PIN')
    const { salt, pinHash } = snap.data() as { salt: string; pinHash: string }
    if ((await hashPin(pin, salt)) !== pinHash) throw new Error('Invalid username or PIN')
    saveSession(name)
    setUsername(name)
  }

  const register = async (rawName: string, pin: string) => {
    const name = rawName.trim().toLowerCase()
    if (!USERNAME_RE.test(name)) throw new Error('Username: 3-20 chars, letters, numbers, underscore')
    if (!/^\d{6}$/.test(pin)) throw new Error('PIN must be 6 digits')
    const salt = randomSalt()
    const pinHash = await hashPin(pin, salt)
    const ref = doc(db, 'users', name)
    await runTransaction(db, async (tx) => {
      if ((await tx.get(ref)).exists()) throw new Error('Username already taken')
      tx.set(ref, { pinHash, salt, createdAt: serverTimestamp() })
    })
    saveSession(name)
    setUsername(name)
  }

  const logout = () => {
    clearSession()
    setUsername(null)
  }

  return <Ctx.Provider value={{ username, login, register, logout }}>{children}</Ctx.Provider>
}
