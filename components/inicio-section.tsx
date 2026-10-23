'use client'

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { api, fmt, Movement } from '@/lib/client'
import { MovementList } from '@/components/movimientos-section'

type Summary = { pointsInCirculation: number; customers: number; redeemsThisMonth: number; linkedCards: number; totalCards: number; topReward: { name: string; count: number } | null; recent: Movement[] }

export function InicioSection() {
  const [s, setS] = useState<Summary | null>(null)
  useEffect(() => { const load = () => api<Summary>('/api/resumen').then(setS).catch(() => {}); load(); const t = setInterval(load, 6000); return () => clearInterval(t) }, [])
  const today = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const kpis = s ? [
    ['Puntos en circulación', fmt(s.pointsInCirculation), 'bg-[#F6D525]'],
    ['Clientes', fmt(s.customers), 'bg-[#E385A4]'],
    ['Canjes este mes', fmt(s.redeemsThisMonth), 'bg-[#F4B6C9]'],
    ['Tarjetas con chip', `${s.linkedCards} / ${s.totalCards}`, 'bg-[#bdf3d3]'],
  ] : []

  return <div className="mx-auto max-w-[1450px] px-5 py-10 sm:px-8 lg:px-10">
    <p className="text-[11px] font-black uppercase tracking-[.22em] text-[#D9628A] first-letter:uppercase">{today}</p>
    <h1 className="mt-2 text-5xl font-black tracking-[-.06em]">Tu bar, <span className="text-[#D9628A]">en movimiento.</span></h1>
    <p className="mt-2 text-sm font-medium text-black/45">Una vista rápida de los puntos, clientes y canjes de Blackbeer.</p>
    <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{kpis.map(([label, value, color]) => <div key={label} className="rounded-2xl bg-white p-5"><div className={`mb-8 flex size-10 items-center justify-center rounded-xl ${color}`}><Sparkles size={18} /></div><p className="text-[10px] font-black uppercase tracking-widest text-black/40">{label}</p><p className="mt-1 text-3xl font-black">{value}</p></div>)}</div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
      <div className="rounded-[28px] bg-[#1E1E1E] p-7"><p className="text-[11px] font-black uppercase tracking-widest text-white/40">Actividad</p><h2 className="mb-5 mt-2 text-2xl text-white">Últimos movimientos</h2><div className="rounded-2xl bg-[#E6E3DD] p-3"><MovementList rows={s?.recent ?? []} /></div></div>
      <div className="rounded-[28px] bg-[#F6D525] p-7"><p className="text-[11px] font-black uppercase tracking-widest text-black/50">Premio estrella</p><h2 className="mt-2 text-3xl">{s?.topReward?.name ?? 'Todavía sin canjes'}</h2><p className="mt-2 text-sm text-black/55">El más canjeado por la comunidad.</p>{s?.topReward && <p className="mt-10 text-4xl font-black">{s.topReward.count} <span className="text-sm">canjes</span></p>}</div>
    </div>
  </div>
}
