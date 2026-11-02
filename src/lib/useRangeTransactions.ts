import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import type { Txn } from '../types'

/** Transactions with monthKey in [fromMonth, toMonth] (single-field range, no composite index). */
export function useRangeTransactions(username: string, fromMonth: string, toMonth: string) {
  const [items, setItems] = useState<Txn[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    const q = query(collection(db, 'users', username, 'transactions'),
      where('monthKey', '>=', fromMonth), where('monthKey', '<=', toMonth))
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Txn, 'id'>) })))
      setLoading(false)
    })
  }, [username, fromMonth, toMonth])
  return { items, loading }
}
