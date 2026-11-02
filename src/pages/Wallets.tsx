import { useState } from 'react'
import { addDoc, collection, doc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../auth/AuthContext'
import { useCollection } from '../lib/useCollection'
import { formatINR, toPaise } from '../lib/money'
import type { Wallet } from '../types'
import Sheet, { btnGhost, btnPrimary, inputCls } from '../components/Sheet'

export default function Wallets() {
  const { username } = useAuth()
  const { items, loading } = useCollection<Wallet>(username!, 'wallets')
  const [editing, setEditing] = useState<Wallet | 'new' | null>(null)
  const [name, setName] = useState('')
  const [opening, setOpening] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [error, setError] = useState('')

  const list = items
    .filter((w) => showArchived || !w.archived)
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.createdAt - b.createdAt)

  const open = (w: Wallet | 'new') => {
    setEditing(w); setError('')
    setName(w === 'new' ? '' : w.name)
    setOpening('')
  }
  const close = () => setEditing(null)
  const walletRef = (id: string) => doc(db, 'users', username!, 'wallets', id)

  const save = async () => {
    const n = name.trim()
    if (!n) return setError('Name required')
    if (items.some((w) => w.name.toLowerCase() === n.toLowerCase() && w !== editing))
      return setError('A wallet with this name exists')
    if (editing === 'new') {
      const bal = opening ? toPaise(opening) : 0
      if (bal === null) return setError('Invalid opening balance')
      await addDoc(collection(db, 'users', username!, 'wallets'), {
        name: n, icon: '👛', openingBalance: bal, balance: bal,
        isDefault: items.length === 0, archived: false, createdAt: Date.now(),
      })
    } else if (editing) {
      await updateDoc(walletRef(editing.id), { name: n })
    }
    close()
  }

  const makeDefault = async (w: Wallet) => {
    const batch = writeBatch(db)
    items.forEach((x) => { if (x.isDefault && x.id !== w.id) batch.update(walletRef(x.id), { isDefault: false }) })
    batch.update(walletRef(w.id), { isDefault: true })
    await batch.commit()
    close()
  }

  const toggleArchive = async (w: Wallet) => {
    await updateDoc(walletRef(w.id), { archived: !w.archived })
    close()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Wallets</h1>
        <button onClick={() => open('new')} className="rounded-xl bg-emerald-500 text-slate-900 font-semibold px-4 py-2">+ New</button>
      </div>
      {loading && <p className="text-slate-400">Loading…</p>}
      <ul className="space-y-2">
        {list.map((w) => (
          <li key={w.id}>
            <button onClick={() => open(w)}
              className={`w-full text-left rounded-2xl bg-slate-800 p-4 flex items-center gap-3 ${w.archived ? 'opacity-50' : ''}`}>
              <span className="text-2xl">{w.icon}</span>
              <span className="flex-1">
                <span className="block font-medium">
                  {w.name}
                  {w.isDefault && <span className="ml-2 text-xs text-emerald-400">Default</span>}
                  {w.archived && <span className="ml-2 text-xs text-slate-400">Archived</span>}
                </span>
              </span>
              <span className={w.balance < 0 ? 'text-red-400' : ''}>{formatINR(w.balance)}</span>
            </button>
          </li>
        ))}
      </ul>
      <label className="flex items-center gap-2 text-sm text-slate-400">
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived
      </label>

      {editing && (
        <Sheet title={editing === 'new' ? 'New wallet' : 'Edit wallet'} onClose={close}>
          <input className={inputCls} placeholder="Wallet name" value={name} onChange={(e) => setName(e.target.value)} />
          {editing === 'new' && (
            <input className={inputCls} placeholder="Opening balance (₹, optional)" inputMode="decimal"
              value={opening} onChange={(e) => setOpening(e.target.value)} />
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button className={btnPrimary} onClick={save}>Save</button>
          {editing !== 'new' && !editing.isDefault && !editing.archived && (
            <button className={btnGhost} onClick={() => makeDefault(editing)}>Set as default</button>
          )}
          {editing !== 'new' && !editing.isDefault && (
            <button className={btnGhost} onClick={() => toggleArchive(editing)}>
              {editing.archived ? 'Unarchive' : 'Archive'}
            </button>
          )}
        </Sheet>
      )}
    </div>
  )
}
