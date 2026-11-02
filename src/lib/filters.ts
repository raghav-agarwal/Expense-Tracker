import { toPaise } from './money'
import type { Txn } from '../types'

export interface Filters {
  walletId: string
  type: '' | 'credit' | 'debit'
  transfers: 'show' | 'hide' | 'only'
  categoryIds: string[]
  month: string // YYYY-MM
  from: string // YYYY-MM-DD
  to: string
  min: string // rupees
  max: string
}

export const emptyFilters: Filters = {
  walletId: '', type: '', transfers: 'show', categoryIds: [], month: '', from: '', to: '', min: '', max: '',
}

export const countActive = (f: Filters) =>
  [f.walletId, f.type, f.transfers !== 'show', f.categoryIds.length, f.month, f.from || f.to, f.min || f.max]
    .filter(Boolean).length

export function applyFilters(txns: Txn[], f: Filters, search: string, walletName: (id: string) => string): Txn[] {
  const tokens = search.toLowerCase().split(/\s+/).filter(Boolean)
  const min = f.min ? toPaise(f.min) : null
  const max = f.max ? toPaise(f.max) : null

  return txns.filter((t) => {
    if (f.walletId && t.walletId !== f.walletId) return false
    if (f.type && t.type !== f.type) return false
    if (f.transfers === 'hide' && t.isTransfer) return false
    if (f.transfers === 'only' && !t.isTransfer) return false
    if (f.categoryIds.length && !f.categoryIds.includes(t.categoryId)) return false
    if (f.month && t.monthKey !== f.month) return false
    if (f.from && t.date < f.from) return false
    if (f.to && t.date > f.to) return false
    if (min !== null && t.amount < min) return false
    if (max !== null && t.amount > max) return false
    if (tokens.length) {
      const hay = [t.remarks, t.categoryName, walletName(t.walletId), t.isTransfer ? walletName(t.transferPeer ?? '') : '',
        String(t.amount / 100), t.date].join(' ').toLowerCase()
      if (!tokens.every((tok) => hay.includes(tok))) return false
    }
    return true
  })
}
