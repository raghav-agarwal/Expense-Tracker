import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

/** Realtime listener for users/{username}/{name}. */
export function useCollection<T>(username: string, name: string) {
  const [items, setItems] = useState<(T & { id: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onSnapshot(collection(db, 'users', username, name), (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) })))
      setLoading(false)
    })
  }, [username, name])

  return { items, loading }
}
