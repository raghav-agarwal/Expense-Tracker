import { collection, doc, getDoc, getDocs, limit, query, setDoc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'

const DEBIT: [string, string][] = [
  ['Food', '🍔'], ['Groceries', '🛒'], ['Transport', '🚌'], ['Rent', '🏠'], ['Bills', '💡'],
  ['Shopping', '🛍️'], ['Health', '💊'], ['Entertainment', '🎬'], ['Travel', '✈️'], ['Other', '📦'],
]
const CREDIT: [string, string][] = [
  ['Salary', '💼'], ['Business', '🏪'], ['Gift', '🎁'], ['Refund', '↩️'], ['Interest', '🏦'], ['Other', '📦'],
]

/** Runs once per user (tracked by users/{u}/meta/seed), so deleted defaults stay deleted. */
export async function ensureSeeded(username: string) {
  const metaRef = doc(db, 'users', username, 'meta', 'seed')
  if ((await getDoc(metaRef)).exists()) return

  const catCol = collection(db, 'users', username, 'categories')
  const existing = await getDocs(query(catCol, limit(1)))
  if (!existing.empty) { // seeded before this flag existed
    await setDoc(metaRef, { at: Date.now() })
    return
  }

  const batch = writeBatch(db)
  const add = (type: 'debit' | 'credit', [name, icon]: [string, string]) =>
    batch.set(doc(catCol, `cat_${type}_${name.toLowerCase()}`), {
      name, type, icon, isDefault: true, isSystem: false,
    })
  DEBIT.forEach((c) => add('debit', c))
  CREDIT.forEach((c) => add('credit', c))
  batch.set(doc(catCol, 'cat_transfer'), {
    name: 'Transfer', type: 'transfer', icon: '🔁', isDefault: true, isSystem: true,
  })
  batch.set(doc(db, 'users', username, 'wallets', 'wallet_cash'), {
    name: 'Cash', icon: '💵', openingBalance: 0, balance: 0,
    isDefault: true, archived: false, createdAt: Date.now(),
  })
  batch.set(metaRef, { at: Date.now() })
  await batch.commit()
}
