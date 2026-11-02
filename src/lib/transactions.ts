import { collection, doc, runTransaction } from 'firebase/firestore'
import { db } from '../firebase'
import type { Txn, TxnType } from '../types'

type TxnData = Omit<Txn, 'id'>
type NewTxn = TxnData & { id: string }

const sign = (t: { type: TxnType }) => (t.type === 'credit' ? 1 : -1)
export const todayStr = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)

const cols = (u: string) => ({
  txns: collection(db, 'users', u, 'transactions'),
  wallets: collection(db, 'users', u, 'wallets'),
})

/**
 * Atomically: remove old txns (reversing their effect on wallet balances),
 * write new txns (applying their effect). Covers add / edit / delete for
 * both normal entries and transfer pairs.
 */
async function commit(username: string, removeIds: string[], add: NewTxn[]) {
  const { txns, wallets } = cols(username)
  await runTransaction(db, async (tx) => {
    const olds: Txn[] = []
    for (const id of removeIds) {
      const s = await tx.get(doc(txns, id))
      if (s.exists()) olds.push({ id, ...(s.data() as TxnData) })
    }
    const delta = new Map<string, number>()
    const bump = (w: string, n: number) => delta.set(w, (delta.get(w) ?? 0) + n)
    olds.forEach((o) => bump(o.walletId, -sign(o) * o.amount))
    add.forEach((a) => bump(a.walletId, sign(a) * a.amount))

    const balances = new Map<string, number>()
    for (const w of delta.keys()) {
      const s = await tx.get(doc(wallets, w))
      if (!s.exists()) throw new Error('Wallet not found')
      balances.set(w, (s.data() as { balance: number }).balance)
    }

    // all reads done, now writes
    for (const o of olds) if (!add.some((a) => a.id === o.id)) tx.delete(doc(txns, o.id))
    for (const { id, ...data } of add) tx.set(doc(txns, id), data)
    for (const [w, d] of delta) tx.update(doc(wallets, w), { balance: balances.get(w)! + d })
  })
}

export interface SimpleInput {
  id?: string // present when editing
  createdAt?: number
  walletId: string
  type: TxnType
  amount: number
  categoryId: string
  categoryName: string
  remarks: string
  date: string
}

export async function saveTxn(username: string, i: SimpleInput) {
  const id = i.id ?? doc(cols(username).txns).id
  await commit(username, i.id ? [i.id] : [], [{
    id, walletId: i.walletId, type: i.type, amount: i.amount,
    categoryId: i.categoryId, categoryName: i.categoryName, remarks: i.remarks,
    date: i.date, monthKey: i.date.slice(0, 7), createdAt: i.createdAt ?? Date.now(), isTransfer: false,
  }])
}

export const deleteTxn = (username: string, id: string) => commit(username, [id], [])

export interface TransferInput {
  transferId?: string // present when editing
  createdAt?: number
  from: string
  to: string
  amount: number
  remarks: string
  date: string
}

export async function saveTransfer(username: string, i: TransferInput) {
  const tid = i.transferId ?? doc(cols(username).txns).id
  const base = {
    amount: i.amount, remarks: i.remarks, date: i.date, monthKey: i.date.slice(0, 7),
    createdAt: i.createdAt ?? Date.now(), isTransfer: true, transferId: tid,
    categoryId: 'cat_transfer', categoryName: 'Transfer',
  }
  const out: NewTxn = { ...base, id: `${tid}_out`, type: 'debit', walletId: i.from, transferPeer: i.to }
  const inn: NewTxn = { ...base, id: `${tid}_in`, type: 'credit', walletId: i.to, transferPeer: i.from }
  await commit(username, i.transferId ? [out.id, inn.id] : [], [out, inn])
}

export const deleteTransfer = (username: string, tid: string) =>
  commit(username, [`${tid}_out`, `${tid}_in`], [])
