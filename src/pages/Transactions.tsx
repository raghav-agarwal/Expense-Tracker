import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useCollection } from '../lib/useCollection'
import { useTransactions } from '../lib/useTransactions'
import { applyFilters, countActive, emptyFilters, type Filters } from '../lib/filters'
import { formatINR } from '../lib/money'
import type { Category, Txn, Wallet } from '../types'
import TransactionForm, { type FormMode } from '../components/TransactionForm'
import TxnRow from '../components/TxnRow'
import Sheet, { btnGhost, btnPrimary, inputCls } from '../components/Sheet'

interface FormState { mode: FormMode; existing?: Txn; peer?: Txn }
const PAGE = 50

export default function Transactions() {
  const { username } = useAuth()
  const { items: wallets } = useCollection<Wallet>(username!, 'wallets')
  const { items: categories } = useCollection<Category>(username!, 'categories')
  const { items: txns, loading } = useTransactions(username!, 5000)
  const [form, setForm] = useState<FormState | null>(null)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [showFilters, setShowFilters] = useState(false)
  const [visible, setVisible] = useState(PAGE)

  const wName = (id?: string) => wallets.find((w) => w.id === id)?.name ?? 'Unknown'
  const icon = (t: Txn) => t.isTransfer ? '🔁' : categories.find((c) => c.id === t.categoryId)?.icon ?? '🏷️'

  const filtered = useMemo(
    () => applyFilters(txns, filters, search, wName),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [txns, filters, search, wallets],
  )
  useEffect(() => setVisible(PAGE), [filters, search])

  const totals = useMemo(() => {
    let cr = 0, dr = 0
    filtered.forEach((t) => { if (!t.isTransfer) t.type === 'credit' ? (cr += t.amount) : (dr += t.amount) })
    return { cr, dr }
  }, [filtered])

  // category options come from transactions so deleted categories stay filterable
  const catOptions = useMemo(() => {
    const m = new Map<string, { id: string; name: string; type: string }>()
    txns.forEach((t) => { if (!t.isTransfer) m.set(t.categoryId, { id: t.categoryId, name: t.categoryName, type: t.type }) })
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [txns])

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }))
  const toggleCat = (id: string) =>
    set('categoryIds', filters.categoryIds.includes(id) ? filters.categoryIds.filter((x) => x !== id) : [...filters.categoryIds, id])

  const openTxn = (t: Txn) => {
    if (t.isTransfer) {
      const peer = txns.find((x) => x.transferId === t.transferId && x.id !== t.id)
      setForm({ mode: 'transfer', existing: t, peer })
    } else setForm({ mode: t.type, existing: t })
  }

  const active = countActive(filters)
  const shown = filtered.slice(0, visible)
  let lastDate = ''

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Transactions</h1>
      <div className="grid grid-cols-3 gap-2 text-sm font-semibold">
        <button onClick={() => setForm({ mode: 'credit' })} className="rounded-xl bg-emerald-500 text-slate-900 py-3">+ Credit</button>
        <button onClick={() => setForm({ mode: 'debit' })} className="rounded-xl bg-rose-500 text-slate-900 py-3">− Debit</button>
        <button onClick={() => setForm({ mode: 'transfer' })} className="rounded-xl bg-slate-700 py-3">⇄ Transfer</button>
      </div>

      <div className="flex gap-2">
        <input className={inputCls} type="search" placeholder="Search remarks, category, amount…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <button onClick={() => setShowFilters(true)}
          className={`shrink-0 rounded-xl px-4 ${active ? 'bg-emerald-500 text-slate-900 font-semibold' : 'bg-slate-800'}`}>
          Filters{active ? ` (${active})` : ''}
        </button>
      </div>

      {(search || active > 0) && (
        <p className="text-xs text-slate-400">
          {filtered.length} result{filtered.length === 1 ? '' : 's'} ·{' '}
          <span className="text-emerald-400">In {formatINR(totals.cr)}</span> ·{' '}
          <span className="text-rose-400">Out {formatINR(totals.dr)}</span>
          {active > 0 && <button className="ml-2 text-slate-300 underline" onClick={() => setFilters(emptyFilters)}>Clear filters</button>}
        </p>
      )}

      {loading && <p className="text-slate-400">Loading…</p>}
      {!loading && filtered.length === 0 && (
        <p className="text-slate-400">{txns.length === 0 ? 'No transactions yet.' : 'No matching transactions.'}</p>
      )}
      <ul className="space-y-2">
        {shown.map((t) => {
          const header = t.date !== lastDate ? t.date : ''
          lastDate = t.date
          const title = t.isTransfer
            ? t.type === 'debit' ? `Transfer to ${wName(t.transferPeer)}` : `Transfer from ${wName(t.transferPeer)}`
            : t.categoryName
          return (
            <li key={t.id}>
              {header && <p className="text-xs text-slate-500 mt-3 mb-1">{header}</p>}
              <TxnRow t={t} icon={icon(t)} title={title}
                subtitle={`${wName(t.walletId)}${t.remarks ? ` · ${t.remarks}` : ''}`} onClick={() => openTxn(t)} />
            </li>
          )
        })}
      </ul>
      {filtered.length > visible && (
        <button className={btnGhost} onClick={() => setVisible((v) => v + PAGE)}>
          Load more ({filtered.length - visible} left)
        </button>
      )}

      {showFilters && (
        <Sheet title="Filters" onClose={() => setShowFilters(false)}>
          <div className="space-y-3 max-h-[65vh] overflow-y-auto">
            <label className="block text-xs text-slate-400">Wallet
              <select className={inputCls} value={filters.walletId} onChange={(e) => set('walletId', e.target.value)}>
                <option value="">All wallets</option>
                {wallets.map((w) => <option key={w.id} value={w.id}>{w.name}{w.archived ? ' (archived)' : ''}</option>)}
              </select>
            </label>

            <div>
              <p className="text-xs text-slate-400 mb-1">Type</p>
              <div className="grid grid-cols-3 rounded-xl bg-slate-800 p-1 text-sm">
                {([['', 'All'], ['credit', 'Credit'], ['debit', 'Debit']] as const).map(([v, l]) => (
                  <button key={v} onClick={() => set('type', v)} className={`rounded-lg py-2 ${filters.type === v ? 'bg-slate-600' : 'text-slate-400'}`}>{l}</button>
                ))}
              </div>
            </div>

            <label className="block text-xs text-slate-400">Transfers
              <select className={inputCls} value={filters.transfers} onChange={(e) => set('transfers', e.target.value as Filters['transfers'])}>
                <option value="show">Show transfers</option>
                <option value="hide">Hide transfers</option>
                <option value="only">Transfers only</option>
              </select>
            </label>

            <div>
              <p className="text-xs text-slate-400 mb-1">Categories</p>
              <div className="flex flex-wrap gap-2">
                {catOptions.length === 0 && <span className="text-sm text-slate-500">No categories used yet</span>}
                {catOptions.map((c) => (
                  <button key={c.id} onClick={() => toggleCat(c.id)}
                    className={`rounded-full px-3 py-1 text-sm ${filters.categoryIds.includes(c.id) ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-slate-300'}`}>
                    {c.name} {c.type === 'credit' ? '↑' : '↓'}
                  </button>
                ))}
              </div>
            </div>

            <label className="block text-xs text-slate-400">Month
              <input type="month" className={inputCls} value={filters.month} onChange={(e) => set('month', e.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs text-slate-400">From
                <input type="date" className={inputCls} value={filters.from} onChange={(e) => set('from', e.target.value)} />
              </label>
              <label className="block text-xs text-slate-400">To
                <input type="date" className={inputCls} value={filters.to} onChange={(e) => set('to', e.target.value)} />
              </label>
              <label className="block text-xs text-slate-400">Min ₹
                <input className={inputCls} inputMode="decimal" value={filters.min} onChange={(e) => set('min', e.target.value)} />
              </label>
              <label className="block text-xs text-slate-400">Max ₹
                <input className={inputCls} inputMode="decimal" value={filters.max} onChange={(e) => set('max', e.target.value)} />
              </label>
            </div>
          </div>
          <button className={btnPrimary} onClick={() => setShowFilters(false)}>Show {filtered.length} results</button>
          <button className={btnGhost} onClick={() => setFilters(emptyFilters)}>Reset</button>
        </Sheet>
      )}

      {form && <TransactionForm {...form} wallets={wallets} categories={categories} onClose={() => setForm(null)} />}
    </div>
  )
}
