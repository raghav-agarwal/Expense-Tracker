const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

export default function PinPad({
  value, onChange, length = 6, disabled,
}: { value: string; onChange: (v: string) => void; length?: number; disabled?: boolean }) {
  const press = (k: string) => {
    if (disabled) return
    if (k === '⌫') onChange(value.slice(0, -1))
    else if (value.length < length) onChange(value + k)
  }
  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="flex justify-center gap-3 mb-6">
        {Array.from({ length }).map((_, i) => (
          <span key={i} className={`h-3.5 w-3.5 rounded-full border ${i < value.length ? 'bg-emerald-400 border-emerald-400' : 'border-slate-500'}`} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((k, i) =>
          k === '' ? <span key={i} /> : (
            <button key={i} type="button" onClick={() => press(k)} disabled={disabled}
              className="h-16 rounded-2xl bg-slate-800 text-2xl active:bg-slate-700 disabled:opacity-50">
              {k}
            </button>
          ),
        )}
      </div>
    </div>
  )
}
