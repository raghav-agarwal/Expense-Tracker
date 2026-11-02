import { useState } from 'react'
import { addDoc, collection } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../auth/AuthContext'
import { toPaise } from '../lib/money'
import { deleteTransfer, deleteTxn, saveTransfer, saveTxn, todayStr } from '../lib/transactions'
import type { Category, Txn, Wallet } from '../types'
import Sheet, { btnGhost, btnPrimary, inputCls } from './Sheet'

export type FormMode = 'credit' | 'debit' | 'transfer'
const NEW = '__new__'

interface Props {
  mode: FormMode
  existing?: Txn
  peer?: Txn // other side of a transfer, when editing
  wallets: Wallet[]
  categories: Category[]
  defaultWalletId?: string
  onClose: () => void
}

export default function TransactionForm({ mode, existing, peer, wallets, categories, defaultWalletId, onClose }: Props) {
  const { username } = useAuth()
  const active = wallets.filter((w) => !w.archived || w.id === existing?.walletId || w.id === peer?.walletId)
  const defWallet = (defaultWalletId && active.some((w) => w.id === defaultWalletId) ? defaultWalletId : undefined)
    ?? wallets.find((w) => w.isDefault && !w.archived)?.id ?? active[0]?.id ?? ''

  const outTxn = existing?.type === 'debit' ? existing : peer
  const inTxn = existing?.type === 'credit' ? existing : peer

  const [amount, setAmount] = useState(existing ? String(existing.amount / 100) : '')
  const [walletId, setWalletId] = useState(existing?.walletId ?? defWallet)
  const [fromId, setFromId] = useState(outTxn?.walletId ?? defWallet)
  const [toId, setToId] = useState(inTxn?.walletId ?? active.find((w) => w.id !== defWallet)?.id ?? '')
  const [remarks, setRemarks] = useState(existing?.remarks ?? '')
  const [date, setDate] = useState(existing?.date ?? todayStr())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const options: { id: string; name: string; icon: string }[] = categories
    .filter((c) => !c.isSystem && c.type === mode)
    .sort((a, b) => a.name.localeCompare(b.name))
  if (existing && !existing.isTransfer && !options.some((o) => o.id === existing.categoryId))
    options.unshift({ id: existing.categoryId, name: existing.categoryName, icon: '🏷️' })
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? options[0]?.id ?? NEW)
  const [newCat, setNewCat] = useState('')

  const submit = async () => {
    setError('')
    const paise = toPaise(amount)
    if (paise === null || paise <= 0) return setError('Enter a valid amount')
    if (!date) return setError('Pick a date')
    setBusy(true)
    try {
      if (mode === 'transfer') {
        if (!fromId || !toId) return setError('Pick both wallets')
        if (fromId === toId) return setError('From and To must differ')
        await saveTransfer(username!, {
          transferId: existing?.transferId, createdAt: existing?.createdAt,
          from: fromId, to: toId, amount: paise, remarks: remarks.trim(), date,
        })
      } else {
        if (!walletId) return setError('Pick a wallet')
        let catId = categoryId
        let catName = options.find((o) => o.id === categoryId)?.name ?? ''
        if (categoryId === NEW) {
          const n = newCat.trim()
          if (!n) return setError('Enter a category name')
          const dup = categories.find((c) => c.type === mode && c.name.toLowerCase() === n.toLowerCase())
          if (dup) { catId = dup.id; catName = dup.name }
          else {
            const ref = await addDoc(collection(db, 'users', username!, 'categories'), {
              name: n, type: mode, icon: '🏷️', isDefault: false, isSystem: false,
            })
            catId = ref.id; catName = n
          }
        }
        await saveTxn(username!, {
          id: existing?.id, createdAt: existing?.createdAt, walletId, type: mode, amount: paise,
          categoryId: catId, categoryName: catName, remarks: remarks.trim(), date,
        })
      }
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!existing || !confirm('Delete this entry?' + (existing.isTransfer ? ' Both sides of the transfer will be removed.' : ''))) return
    setBusy(true)
    try {
      if (existing.isTransfer) await deleteTransfer(username!, existing.transferId!)
      else await deleteTxn(username!, existing.id)
      onClose()
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  const title = `${existing ? 'Edit' : 'Add'} ${mode === 'credit' ? 'credit' : mode === 'debit' ? 'debit' : 'transfer'}`
  const walletSelect = (value: string, set: (v: string) => void) => (
    <select className={inputCls} value={value} onChange={(e) => set(e.target.value)}>
      {active.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
    </select>
  )

  return (
    <Sheet title={title} onClose={onClose}>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto">
        <input className={`${inputCls} text-2xl`} placeholder="₹ Amount" inputMode="decimal" autoFocus
          value={amount} onChange={(e) => setAmount(e.target.value)} />
        {mode === 'transfer' ? (
          <>
            <label className="block text-xs text-slate-400">From {walletSelect(fromId, setFromId)}</label>
            <label className="block text-xs text-slate-400">To {walletSelect(toId, setToId)}</label>
          </>
        ) : (
          <>
            <label className="block text-xs text-slate-400">Wallet {walletSelect(walletId, setWalletId)}</label>
            <label className="block text-xs text-slate-400">Category
              <select className={inputCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {options.map((o) => <option key={o.id} value={o.id}>{o.icon} {o.name}</option>)}
                <option value={NEW}>+ Create new category…</option>
              </select>
            </label>
            {categoryId === NEW && (
              <input className={inputCls} placeholder="New category name" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
            )}
          </>
        )}
        <input className={inputCls} placeholder="Remarks (optional)" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button className={btnPrimary} onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      {existing && <button className={`${btnGhost} text-red-400`} onClick={remove} disabled={busy}>Delete</button>}
    </Sheet>
  )
}
