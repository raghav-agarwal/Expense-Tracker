export type TxnType = 'credit' | 'debit'

export interface Wallet {
  id: string
  name: string
  icon: string
  openingBalance: number // paise
  balance: number // paise
  isDefault: boolean
  archived: boolean
  createdAt: number
}

export interface Category {
  id: string
  name: string
  type: TxnType | 'transfer'
  icon: string
  isDefault: boolean // shipped with the app (cannot be deleted)
  isSystem: boolean // hidden from pickers (Transfer)
}

export interface Txn {
  id: string
  walletId: string
  type: TxnType
  amount: number // paise, always > 0
  categoryId: string
  categoryName: string
  remarks: string
  date: string // YYYY-MM-DD
  monthKey: string // YYYY-MM
  createdAt: number
  isTransfer?: boolean
  transferId?: string
  transferPeer?: string // walletId of the other side
}
