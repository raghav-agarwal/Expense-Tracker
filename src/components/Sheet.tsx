import type { ReactNode } from 'react'

export default function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div className="w-full max-w-md mx-auto rounded-t-3xl bg-slate-900 p-5 pb-8 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-slate-400 text-xl px-2">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export const inputCls = 'w-full rounded-xl bg-slate-800 px-4 py-3 outline-none focus:ring-2 ring-emerald-400'
export const btnPrimary = 'w-full rounded-xl bg-emerald-500 text-slate-900 font-semibold py-3 disabled:opacity-50'
export const btnGhost = 'w-full rounded-xl bg-slate-800 py-3'
