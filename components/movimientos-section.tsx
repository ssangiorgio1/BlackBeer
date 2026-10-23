'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { api, fmt, fmtDate, Movement } from '@/lib/client'

export function MovementList({ rows, compact = false }: { rows: Movement[]; compact?: boolean }) {
  if (rows.length === 0) return <p className={`text-sm ${compact ? 'text-black/50' : 'text-black/40'}`}>Todavía no hay movimientos.</p>
  return <div className="flex flex-col gap-2">{rows.map((m) => <div key={m.id} className={`flex items-center gap-3 rounded-2xl p-3 ${compact ? 'bg-white/55' : 'bg-white'}`}>
    <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${m.type === 'EARN' ? 'bg-[#bdf3d3]' : 'bg-[#E385A4]'}`}>{m.type === 'EARN' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}</span>
    <div className="min-w-0 flex-1"><p className="truncate text-xs font-black">{m.customerName ?? ''}{m.customerName ? ' · ' : ''}{m.detail}</p><p className="truncate text-[10px] font-semibold text-black/45">{fmtDate(m.createdAt)} · {m.deviceName}{compact ? '' : ` · ${m.cardBarcode} · saldo ${fmt(m.before)} → ${fmt(m.after)}`}</p></div>
    <span className={`text-sm font-black ${m.type === 'EARN' ? 'text-green-700' : 'text-[#D9628A]'}`}>{m.type === 'EARN' ? '+' : '−'}{fmt(m.points)}</span>
  </div>)}</div>
}

export function MovimientosSection() {
  const [rows, setRows] = useState<Movement[]>([])
  const [filter, setFilter] = useState<'ALL' | 'EARN' | 'REDEEM'>('ALL')
  const load = useCallback(() => api<Movement[]>('/api/movimientos?limit=200').then(setRows).catch(() => {}), [])
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t) }, [load])
  const shown = rows.filter((r) => filter === 'ALL' || r.type === filter)

  return <div className="mx-auto max-w-[1450px] px-5 py-10 sm:px-8 lg:px-10">
    <p className="text-[11px] font-black uppercase tracking-[.22em] text-[#D9628A]">Registro</p>
    <h1 className="mt-2 text-4xl font-black tracking-[-.06em] sm:text-5xl">Movi<span className="text-[#D9628A]">mientos</span></h1>
    <p className="mt-2 max-w-xl text-sm font-medium text-black/45">Cada compra y cada canje, con el cliente, el saldo antes y después, y el dispositivo que lo registró.</p>
    <div className="mt-6 flex gap-2">{([['ALL', 'Todos'], ['EARN', 'Compras'], ['REDEEM', 'Canjes']] as const).map(([k, l]) => <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-4 py-2 text-xs font-black ${filter === k ? 'bg-[#1E1E1E] text-white' : 'bg-white hover:bg-black/5'}`}>{l}</button>)}</div>
    <div className="mt-6"><MovementList rows={shown} /></div>
  </div>
}
