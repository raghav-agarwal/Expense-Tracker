import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useCollection } from '../lib/useCollection'
import { useTransactions } from '../lib/useTransactions'
import TxnRow from '../components/TxnRow'
import type { Category, Txn, Wallet } from '../types'
import TransactionForm, { type FormMode } from '../components/TransactionForm'

interface FormState { mode: FormMode; existing?: Txn; peer?: Txn }

export default function Transactions() {
  const { username } = useAuth()
  const { items: wallets } = useCollection<Wallet>(username!, 'wallets')
  const { items: categories } = useCollection<Category>(username!, 'categories')
  const { items: txns, loading } = useTransactions(username!)
  const [form, setForm] = useState<FormState | null>(null)

  const wName = (id?: string) => wallets.find((w) => w.id === id)?.name ?? 'Unknown'
  const icon = (t: Txn) => t.isTransfer ? '🔁' : categories.find((c) => c.id === t.categoryId)?.icon ?? '🏷️'

  const openTxn = (t: Txn) => {
    if (t.isTransfer) {
      const peer = txns.find((x) => x.transferId === t.transferId && x.id !== t.id)
      setForm({ mode: 'transfer', existing: t, peer })
    } else setForm({ mode: t.type, existing: t })
  }

  let lastDate = ''
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Transactions</h1>
      <div className="grid grid-cols-3 gap-2 text-sm font-semibold">
        <button onClick={() => setForm({ mode: 'credit' })} className="rounded-xl bg-emerald-500 text-slate-900 py-3">+ Credit</button>
        <button onClick={() => setForm({ mode: 'debit' })} className="rounded-xl bg-rose-500 text-slate-900 py-3">− Debit</button>
        <button onClick={() => setForm({ mode: 'transfer' })} className="rounded-xl bg-slate-700 py-3">⇄ Transfer</button>
      </div>
      {loading && <p className="text-slate-400">Loading…</p>}
      {!loading && txns.length === 0 && <p className="text-slate-400">No transactions yet.</p>}
      <ul className="space-y-2">
        {txns.map((t) => {
          const header = t.date !== lastDate ? t.date : ''
          lastDate = t.date
          const title = t.isTransfer
            ? t.type === 'debit' ? `Transfer to ${wName(t.transferPeer)}` : `Transfer from ${wName(t.transferPeer)}`
            : t.categoryName
          return (
            <li key={t.id}>
              {header && <p className="text-xs text-slate-500 mt-3 mb-1">{header}</p>}
              <TxnRow t={t} icon={icon(t)} title={title} subtitle={`${wName(t.walletId)}${t.remarks ? ` · ${t.remarks}` : ''}`} onClick={() => openTxn(t)} />
            </li>
          )
        })}
      </ul>
      {form && <TransactionForm {...form} wallets={wallets} categories={categories} onClose={() => setForm(null)} />}
    </div>
  )
}
