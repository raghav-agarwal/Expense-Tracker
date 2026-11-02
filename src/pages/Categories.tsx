import { useState } from 'react'
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../auth/AuthContext'
import { useCollection } from '../lib/useCollection'
import type { Category, TxnType } from '../types'
import Sheet, { btnGhost, btnPrimary, inputCls } from '../components/Sheet'

export default function Categories() {
  const { username } = useAuth()
  const { items, loading } = useCollection<Category>(username!, 'categories')
  const [tab, setTab] = useState<TxnType>('debit')
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🏷️')
  const [error, setError] = useState('')

  const list = items
    .filter((c) => !c.isSystem && c.type === tab)
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name))

  const open = (c: Category | 'new') => {
    setEditing(c); setError('')
    setName(c === 'new' ? '' : c.name)
    setIcon(c === 'new' ? '🏷️' : c.icon)
  }
  const close = () => setEditing(null)

  const save = async () => {
    const n = name.trim()
    if (!n) return setError('Name required')
    if (items.some((c) => c.type === tab && c.name.toLowerCase() === n.toLowerCase() && c !== editing))
      return setError('Category already exists')
    if (editing === 'new') {
      await addDoc(collection(db, 'users', username!, 'categories'), {
        name: n, type: tab, icon: icon || '🏷️', isDefault: false, isSystem: false,
      })
    } else if (editing) {
      await updateDoc(doc(db, 'users', username!, 'categories', editing.id), { name: n, icon: icon || '🏷️' })
    }
    close()
  }

  const remove = async (c: Category) => {
    if (!confirm(`Delete "${c.name}"? Existing transactions keep their category name.`)) return
    await deleteDoc(doc(db, 'users', username!, 'categories', c.id))
    close()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Categories</h1>
        <button onClick={() => open('new')} className="rounded-xl bg-emerald-500 text-slate-900 font-semibold px-4 py-2">+ New</button>
      </div>
      <div className="grid grid-cols-2 rounded-xl bg-slate-800 p-1">
        {(['debit', 'credit'] as TxnType[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg py-2 capitalize ${tab === t ? 'bg-slate-600' : 'text-slate-400'}`}>
            {t === 'debit' ? 'Expense' : 'Income'}
          </button>
        ))}
      </div>
      {loading && <p className="text-slate-400">Loading…</p>}
      <ul className="space-y-2">
        {list.map((c) => (
          <li key={c.id}>
            <button onClick={() => open(c)} className="w-full text-left rounded-2xl bg-slate-800 p-3 flex items-center gap-3">
              <span className="text-2xl">{c.icon}</span>
              <span className="flex-1">{c.name}</span>
              {c.isDefault && <span className="text-xs text-slate-500">Default</span>}
            </button>
          </li>
        ))}
      </ul>

      {editing && (
        <Sheet title={editing === 'new' ? `New ${tab === 'debit' ? 'expense' : 'income'} category` : 'Edit category'} onClose={close}>
          <div className="flex gap-2">
            <input className={`${inputCls} !w-16 text-center`} value={icon} maxLength={4} onChange={(e) => setIcon(e.target.value)} />
            <input className={inputCls} placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button className={btnPrimary} onClick={save}>Save</button>
          {editing !== 'new' && (
            <button className={`${btnGhost} text-red-400`} onClick={() => remove(editing)}>Delete</button>
          )}
        </Sheet>
      )}
    </div>
  )
}
