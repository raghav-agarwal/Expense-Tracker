import { useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useAuth } from '../auth/AuthContext'
import { useCollection } from '../lib/useCollection'
import { useRangeTransactions } from '../lib/useRangeTransactions'
import { formatINR } from '../lib/money'
import { todayStr } from '../lib/transactions'
import type { Wallet } from '../types'
import { inputCls } from '../components/Sheet'

const COLORS = ['#34d399', '#f87171', '#60a5fa', '#fbbf24', '#a78bfa', '#f472b6', '#2dd4bf', '#fb923c', '#94a3b8', '#84cc16']
const GREEN = '#34d399'
const RED = '#f87171'
const TREND_MONTHS = 6

const addMonths = (key: string, n: number) => {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const monthLabel = (key: string, short = false) => {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', short ? { month: 'short' } : { month: 'long', year: 'numeric' })
}
const money = (v: unknown) => formatINR(Number(v) * 100)
const tooltipStyle = { background: '#0f172a', border: '1px solid #334155', borderRadius: 12 }

export default function Reports() {
  const { username } = useAuth()
  const { items: wallets } = useCollection<Wallet>(username!, 'wallets')
  const [month, setMonth] = useState(todayStr().slice(0, 7))
  const [walletId, setWalletId] = useState('')
  const [kind, setKind] = useState<'debit' | 'credit'>('debit')

  const { items, loading } = useRangeTransactions(username!, addMonths(month, -(TREND_MONTHS - 1)), month)

  // transfers are not real income/expense
  const real = useMemo(
    () => items.filter((t) => !t.isTransfer && (!walletId || t.walletId === walletId)),
    [items, walletId],
  )
  const current = useMemo(() => real.filter((t) => t.monthKey === month), [real, month])

  const income = current.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0)
  const expense = current.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0)
  const net = income - expense

  const byCategory = useMemo(() => {
    const m = new Map<string, number>()
    current.filter((t) => t.type === kind).forEach((t) => m.set(t.categoryName, (m.get(t.categoryName) ?? 0) + t.amount))
    return [...m.entries()].map(([name, paise]) => ({ name, value: paise / 100 })).sort((a, b) => b.value - a.value)
  }, [current, kind])
  const catTotal = byCategory.reduce((s, c) => s + c.value, 0)

  const daily = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    const days = new Date(y, m, 0).getDate()
    const arr = Array.from({ length: days }, (_, i) => ({ day: i + 1, income: 0, expense: 0 }))
    current.forEach((t) => {
      const d = Number(t.date.slice(8, 10)) - 1
      if (arr[d]) arr[d][t.type === 'credit' ? 'income' : 'expense'] += t.amount / 100
    })
    return arr
  }, [current, month])

  const trend = useMemo(() => {
    return Array.from({ length: TREND_MONTHS }, (_, i) => {
      const key = addMonths(month, i - (TREND_MONTHS - 1))
      const rows = real.filter((t) => t.monthKey === key)
      return {
        month: monthLabel(key, true),
        income: rows.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0) / 100,
        expense: rows.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0) / 100,
      }
    })
  }, [real, month])

  const isCurrentMonth = month >= todayStr().slice(0, 7)
  const axis = { stroke: '#64748b', fontSize: 11 }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Reports</h1>

      <div className="flex items-center justify-between rounded-2xl bg-slate-800 p-2">
        <button className="px-4 py-2 text-xl" onClick={() => setMonth(addMonths(month, -1))}>‹</button>
        <span className="font-medium">{monthLabel(month)}</span>
        <button className="px-4 py-2 text-xl disabled:opacity-30" disabled={isCurrentMonth} onClick={() => setMonth(addMonths(month, 1))}>›</button>
      </div>

      <select className={inputCls} value={walletId} onChange={(e) => setWalletId(e.target.value)}>
        <option value="">All wallets</option>
        {wallets.map((w) => <option key={w.id} value={w.id}>{w.name}{w.archived ? ' (archived)' : ''}</option>)}
      </select>

      {loading && <p className="text-slate-400">Loading…</p>}

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-slate-800 p-3"><p className="text-xs text-slate-400">Income</p><p className="text-sm font-semibold text-emerald-400">{formatINR(income)}</p></div>
        <div className="rounded-2xl bg-slate-800 p-3"><p className="text-xs text-slate-400">Expense</p><p className="text-sm font-semibold text-rose-400">{formatINR(expense)}</p></div>
        <div className="rounded-2xl bg-slate-800 p-3"><p className="text-xs text-slate-400">Net</p><p className={`text-sm font-semibold ${net < 0 ? 'text-red-400' : ''}`}>{formatINR(net)}</p></div>
      </div>
      <p className="text-xs text-slate-500">Transfers between wallets are excluded.</p>

      <section className="rounded-2xl bg-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">By category</h2>
          <div className="grid grid-cols-2 rounded-lg bg-slate-900 p-1 text-xs">
            {([['debit', 'Expense'], ['credit', 'Income']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setKind(v)} className={`rounded-md px-3 py-1 ${kind === v ? 'bg-slate-600' : 'text-slate-400'}`}>{l}</button>
            ))}
          </div>
        </div>
        {byCategory.length === 0 ? <p className="text-sm text-slate-400">No data for this month.</p> : (
          <>
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} stroke="none">
                    {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={money} contentStyle={tooltipStyle} itemStyle={{ color: '#e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-2">
              {byCategory.map((c, i) => (
                <li key={c.name} className="flex items-center gap-2 text-sm">
                  <span className="h-3 w-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="flex-1">{c.name}</span>
                  <span className="text-slate-400">{((c.value / catTotal) * 100).toFixed(0)}%</span>
                  <span className="w-28 text-right">{money(c.value)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="rounded-2xl bg-slate-800 p-4 space-y-3">
        <h2 className="font-medium">Daily</h2>
        <div className="h-52">
          <ResponsiveContainer>
            <BarChart data={daily} margin={{ left: -15, right: 4 }}>
              <CartesianGrid stroke="#334155" vertical={false} />
              <XAxis dataKey="day" {...axis} interval={4} />
              <YAxis {...axis} />
              <Tooltip formatter={money} labelFormatter={(d) => `Day ${d}`} contentStyle={tooltipStyle} cursor={{ fill: '#33415540' }} />
              <Bar dataKey="income" fill={GREEN} radius={[3, 3, 0, 0]} />
              <Bar dataKey="expense" fill={RED} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl bg-slate-800 p-4 space-y-3">
        <h2 className="font-medium">Last {TREND_MONTHS} months</h2>
        <div className="h-56">
          <ResponsiveContainer>
            <BarChart data={trend} margin={{ left: -15, right: 4 }}>
              <CartesianGrid stroke="#334155" vertical={false} />
              <XAxis dataKey="month" {...axis} />
              <YAxis {...axis} />
              <Tooltip formatter={money} contentStyle={tooltipStyle} cursor={{ fill: '#33415540' }} />
              <Legend />
              <Bar dataKey="income" name="Income" fill={GREEN} radius={[3, 3, 0, 0]} />
              <Bar dataKey="expense" name="Expense" fill={RED} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
