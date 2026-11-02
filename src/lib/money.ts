const fmt = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', minimumFractionDigits: 2,
})

/** paise (integer) -> "₹1,23,456.00" */
export const formatINR = (paise: number) => fmt.format(paise / 100)

/** "123.45" -> 12345 paise. Returns null if invalid. */
export function toPaise(input: string): number | null {
  const n = Number(input.trim())
  if (!input.trim() || !Number.isFinite(n)) return null
  return Math.round(n * 100)
}
