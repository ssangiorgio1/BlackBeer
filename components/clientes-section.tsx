'use client'

import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { api, CardView, fmt, Movement } from '@/lib/client'
import { MovementList } from '@/components/movimientos-section'

export function ClientesSection() {
  const [cards, setCards] = useState<CardView[]>([])
  const [selected, setSelected] = useState('')
  const [rows, setRows] = useState<Movement[]>([])
  const [q, setQ] = useState('')

  useEffect(() => { api<CardView[]>('/api/tarjetas').then((c) => { setCards(c); setSelected((s) => s || c[0]?.id || '') }).catch(() => {}) }, [])
  const sel = cards.find((c) => c.id === selected)
  useEffect(() => { if (sel) api<Movement[]>(`/api/movimientos?customerId=${sel.customer.id}&limit=30`).then(setRows).catch(() => {}) }, [sel?.customer.id])
  const shown = cards.filter((c) => (c.customer.name + c.barcode).toLowerCase().includes(q.toLowerCase()))

  return <div className="mx-auto max-w-[1450px] px-5 py-10 sm:px-8 lg:px-10">
    <p className="text-[11px] font-black uppercase tracking-[.22em] text-[#D9628A]">Comunidad</p>
    <h1 className="mt-2 text-4xl font-black tracking-[-.06em] sm:text-5xl">Clien<span className="text-[#D9628A]">tes</span></h1>
    <div className="mt-8 grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
      <section className="rounded-[28px] bg-[#1E1E1E] p-6 text-white">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o código" className="mb-4 w-full rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold outline-none placeholder:text-white/30" />
        <div className="flex max-h-[520px] flex-col gap-2 overflow-y-auto">{shown.map((c) => <button key={c.id} onClick={() => setSelected(c.id)} className={`flex items-center gap-3 rounded-xl p-3 text-left ${selected === c.id ? 'bg-[#F6D525] text-black' : 'bg-white/5 hover:bg-white/10'}`}><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black">{c.customer.name}</span><span className={`block text-[10px] font-semibold ${selected === c.id ? 'text-black/55' : 'text-white/40'}`}>{c.barcode} · {c.nfcUid ? 'con chip' : 'sin chip'}</span></span><span className="text-sm font-black">{fmt(c.customer.points)}</span></button>)}</div>
      </section>
      <section>
        {sel && <>
          <div className="rounded-[28px] bg-[#E385A4] p-6 sm:p-8"><p className="text-[11px] font-black uppercase tracking-widest text-black/50">{sel.barcode}</p><h2 className="mt-1 text-3xl">{sel.customer.name}</h2><p className="mt-4 text-5xl font-black">{fmt(sel.customer.points)}<span className="ml-2 text-base">puntos</span></p>
            <a href={`/c/${sel.token}`} target="_blank" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1E1E1E] px-4 py-2.5 text-xs font-bold text-white"><ExternalLink size={14} />Ver como lo ve el cliente</a></div>
          <h3 className="mb-3 mt-6 text-xl">Historial</h3>
          <MovementList rows={rows} />
        </>}
      </section>
    </div>
  </div>
}
