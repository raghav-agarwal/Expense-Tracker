import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ensureSeeded } from '../lib/seed'

const tabs = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/transactions', label: 'Activity', icon: '💸' },
  { to: '/wallets', label: 'Wallets', icon: '👛' },
  { to: '/categories', label: 'Categories', icon: '🏷️' },
]

export default function Layout() {
  const { username } = useAuth()
  useEffect(() => { if (username) ensureSeeded(username).catch(console.error) }, [username])

  return (
    <div className="h-full flex flex-col max-w-md mx-auto">
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 inset-x-0 bg-slate-900 border-t border-slate-800">
        <div className="max-w-md mx-auto flex" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to} end
              className={({ isActive }) => `flex-1 py-2 text-center text-xs ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}>
              <div className="text-xl">{t.icon}</div>{t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
