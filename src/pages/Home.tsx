import { useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../auth/AuthContext'
import { useCollection } from '../lib/useCollection'
import { useWalletTransactions } from '../lib/useWalletTransactions'
import { formatINR } from '../lib/money'
import type { Category, Txn, Wallet } from '../types'
import TransactionForm, { type FormMode } from '../components/TransactionForm'
import TxnRow from '../components/TxnRow'

const KEY = 'expense_selected_wallet'
interface FormState { mode: FormMode; existing?: Txn; peer?: Txn }

export default function Home() {
  const { username, logout } = useAuth()
  const { items: wallets, loading: wLoading } = useCollection<Wallet>(username!, 'wallets')
  const { items: categories } = useCollection<Category>(username!, 'categories')
  const [sel, setSel] = useState(() => localStorage.getItem(KEY) ?? '')
  const [form, setForm] = useState<FormState | null>(null)

  const active = wallets
    .filter((w) => !w.archived)
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.createdAt - b.createdAt)
  const current = active.find((w) => w.id === sel) ?? active.find((w) => w.isDefault) ?? active[0]
  const total = active.reduce((s, w) => s + w.balance, 0)

  const { items: txns, loading, error } = useWalletTransactions(username!, current?.id)

  const select = (id: string) => { setSel(id); localStorage.setItem(KEY, id) }
  const wName = (id?: string) => wallets.find((w) => w.id === id)?.name ?? 'Unknown'
  const icon = (t: Txn) => t.isTransfer ? '🔁' : categories.find((c) => c.id === t.categoryId)?.icon ?? '🏷️'

  const openTxn = async (t: Txn) => {
    if (!t.isTransfer) return setForm({ mode: t.type, existing: t })
    const peerId = `${t.transferId}_${t.type === 'debit' ? 'in' : 'out'}`
    const snap = await getDoc(doc(db, 'users', username!, 'transactions', peerId))
    const peer = snap.exists() ? ({ id: snap.id, ...snap.data() } as Txn) : undefined
    setForm({ mode: 'transfer', existing: t, peer })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Hi, {username}</h1>
        <button onClick={logout} className="text-sm text-slate-400 rounded-lg bg-slate-800 px-3 py-1.5">Log out</button>
      </div>

      {wLoading && <p className="text-slate-400">Loading…</p>}
      {!wLoading && active.length === 0 && (
        <p className="text-slate-400">No wallet yet. <Link to="/wallets" className="text-emerald-400">Create one</Link>.</p>
      )}

      {active.length > 0 && (
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          {active.map((w) => (
            <button key={w.id} onClick={() => select(w.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm ${w.id === current?.id ? 'bg-emerald-500 text-slate-900 font-semibold' : 'bg-slate-800 text-slate-300'}`}>
              {w.icon} {w.name}
            </button>
          ))}
        </div>
      )}

      {current && (
        <>
          <div className="rounded-3xl bg-gradient-to-br from-slate-800 to-slate-700 p-5">
            <p className="text-sm text-slate-400">{current.name} balance</p>
            <p className={`text-4xl font-semibold mt-1 ${current.balance < 0 ? 'text-red-400' : ''}`}>{formatINR(current.balance)}</p>
            {active.length > 1 && <p className="text-xs text-slate-400 mt-3">All wallets: {formatINR(total)}</p>}
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm font-semibold">
            <button onClick={() => setForm({ mode: 'credit' })} className="rounded-xl bg-emerald-500 text-slate-900 py-3">+ Credit</button>
            <button onClick={() => setForm({ mode: 'debit' })} className="rounded-xl bg-rose-500 text-slate-900 py-3">− Debit</button>
            <button onClick={() => setForm({ mode: 'transfer' })} className="rounded-xl bg-slate-700 py-3">⇄ Transfer</button>
          </div>

          <div className="flex items-center justify-between pt-2">
            <h2 className="font-medium">Recent transactions</h2>
            <Link to="/transactions" className="text-sm text-emerald-400">See all</Link>
          </div>
          {loading && <p className="text-slate-400">Loading…</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
          {!loading && !error && txns.length === 0 && <p className="text-slate-400 text-sm">No transactions in this wallet yet.</p>}
          <ul className="space-y-2">
            {txns.map((t) => (
              <li key={t.id}>
                <TxnRow t={t} icon={icon(t)} onClick={() => openTxn(t)}
                  title={t.isTransfer ? `Transfer ${t.type === 'debit' ? 'to' : 'from'} ${wName(t.transferPeer)}` : t.categoryName}
                  subtitle={`${t.date}${t.remarks ? ` · ${t.remarks}` : ''}`} />
              </li>
            ))}
          </ul>
        </>
      )}

      {form && <TransactionForm {...form} wallets={wallets} categories={categories}
        defaultWalletId={current?.id} onClose={() => setForm(null)} />}
    </div>
  )
}
