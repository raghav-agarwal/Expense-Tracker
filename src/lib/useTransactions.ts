import { useEffect, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'
import type { Txn } from '../types'

export function useTransactions(username: string, max = 200) {
  const [items, setItems] = useState<Txn[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const q = query(collection(db, 'users', username, 'transactions'), orderBy('date', 'desc'), limit(max))
    return onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Txn, 'id'>) }))
      rows.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
      setItems(rows)
      setLoading(false)
    })
  }, [username, max])
  return { items, loading }
}
