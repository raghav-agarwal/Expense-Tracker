import { formatINR } from '../lib/money'
import type { Txn } from '../types'

export default function TxnRow({ t, icon, title, subtitle, onClick }: {
  t: Txn; icon: string; title: string; subtitle: string; onClick: () => void
}) {
  return (
    <button onClick={onClick} className="w-full text-left rounded-2xl bg-slate-800 p-3 flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block truncate">{title}</span>
        <span className="block text-xs text-slate-400 truncate">{subtitle}</span>
      </span>
      <span className={t.type === 'credit' ? 'text-emerald-400' : 'text-rose-400'}>
        {t.type === 'credit' ? '+' : '−'}{formatINR(t.amount)}
      </span>
    </button>
  )
}
