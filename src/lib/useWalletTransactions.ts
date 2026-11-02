import { useEffect, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import type { Txn } from '../types'

/** Latest `max` transactions of one wallet (needs the composite index in firestore.indexes.json). */
export function useWalletTransactions(username: string, walletId: string | undefined, max = 10) {
  const [items, setItems] = useState<Txn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!walletId) { setItems([]); return }
    setLoading(true)
    const q = query(
      collection(db, 'users', username, 'transactions'),
      where('walletId', '==', walletId), orderBy('date', 'desc'), orderBy('createdAt', 'desc'), limit(max),
    )
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Txn, 'id'>) })))
      setError(''); setLoading(false)
    }, (e) => { setError(e.message); setLoading(false) })
  }, [username, walletId, max])

  return { items, loading, error }
}
