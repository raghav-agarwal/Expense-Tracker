const KEY = 'expense_session'
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

interface Session { username: string; loginAt: number }

export function saveSession(username: string) {
  localStorage.setItem(KEY, JSON.stringify({ username, loginAt: Date.now() } as Session))
}

export function loadSession(): string | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const s: Session = JSON.parse(raw)
    if (!s.username || Date.now() - s.loginAt > THIRTY_DAYS) {
      clearSession()
      return null
    }
    return s.username
  } catch {
    return null
  }
}

export function clearSession() {
  localStorage.removeItem(KEY)
}
