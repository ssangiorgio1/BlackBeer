'use client'

import { use, useEffect, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Gift } from 'lucide-react'
import { NfcCard3D } from '@/components/nfc-card-3d'
import { api, fmt, fmtDate } from '@/lib/client'

type Data = {
  name: string; points: number; barcode: string
  rewards: { id: string; name: string; cost: number }[]
  history: { id: string; type: 'EARN' | 'REDEEM'; points: number; detail: string; createdAt: string }[]
}

// Página pública del cliente: se abre al acercar la tarjeta a cualquier celular (la URL está grabada en el chip). Solo lectura.
export default function ClientePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { api<Data>(`/api/cliente/${token}`).then(setData).catch((e) => setError(e.message)) }, [token])

  if (error) return <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#1E1E1E] p-8 text-center text-white"><img src="/blackbeer-logo.png" alt="Blackbeer" className="w-48" /><p className="text-sm text-white/60">No encontramos esta tarjeta. Consultá en el local.</p></main>
  if (!data) return <main className="flex min-h-screen items-center justify-center bg-[#1E1E1E]"><img src="/blackbeer-logo.png" alt="Blackbeer" className="w-40 animate-pulse" /></main>

  const next = data.rewards.find((r) => r.cost > data.points)
  const first = data.name.split(' ')[0]

  return <main className="min-h-screen bg-[#1E1E1E] px-5 pb-16 pt-8 text-white">
    <div className="mx-auto max-w-md">
      <img src="/blackbeer-logo.png" alt="Blackbeer" className="mx-auto w-40" />
      <p className="mt-6 text-center text-[11px] font-black uppercase tracking-[.22em] text-[#E385A4]">Hola, {first}</p>
      <div className="mt-2 scale-[.85]"><NfcCard3D design="D" flipped={false} /></div>

      <div className="-mt-4 rounded-[28px] bg-[#F6D525] p-6 text-center text-black">
        <p className="text-[11px] font-black uppercase tracking-widest text-black/50">Tus puntos</p>
        <p className="font-[family-name:var(--font-anton)] text-7xl leading-none">{fmt(data.points)}</p>
        {next ? <div className="mt-5"><div className="h-2.5 overflow-hidden rounded-full bg-black/15"><div className="h-full rounded-full bg-[#1E1E1E]" style={{ width: `${Math.min(100, (data.points / next.cost) * 100)}%` }} /></div><p className="mt-2 text-xs font-bold">Te faltan {fmt(next.cost - data.points)} puntos para “{next.name}”</p></div> : <p className="mt-4 text-xs font-bold">¡Ya alcanzás todos los premios!</p>}
      </div>

      <h2 className="mb-3 mt-8 text-2xl">Premios</h2>
      <div className="flex flex-col gap-2">{data.rewards.map((r) => { const ok = data.points >= r.cost; return <div key={r.id} className={`flex items-center gap-3 rounded-2xl p-4 ${ok ? 'bg-white/10' : 'bg-white/5 opacity-60'}`}><Gift size={18} className="text-[#F6D525]" /><span className="flex-1 text-sm font-bold">{r.name}</span><span className="text-right text-xs font-black">{fmt(r.cost)} pts<span className={`block text-[10px] font-semibold ${ok ? 'text-[#bdf3d3]' : 'text-white/40'}`}>{ok ? '¡Ya podés canjearlo!' : `Faltan ${fmt(r.cost - data.points)}`}</span></span></div> })}</div>
      <p className="mt-3 text-center text-xs font-semibold text-white/40">Para canjear, mostrá tu tarjeta en la caja.</p>

      <h2 className="mb-3 mt-8 text-2xl">Tus movimientos</h2>
      <div className="flex flex-col gap-2">{data.history.length === 0 && <p className="text-sm text-white/40">Todavía no tenés movimientos.</p>}{data.history.map((m) => <div key={m.id} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3"><span className={`flex size-9 items-center justify-center rounded-full text-black ${m.type === 'EARN' ? 'bg-[#bdf3d3]' : 'bg-[#E385A4]'}`}>{m.type === 'EARN' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{m.detail}</p><p className="text-[10px] text-white/40">{fmtDate(m.createdAt)}</p></div><span className={`text-sm font-black ${m.type === 'EARN' ? 'text-[#bdf3d3]' : 'text-[#E385A4]'}`}>{m.type === 'EARN' ? '+' : '−'}{fmt(m.points)}</span></div>)}</div>
    </div>
  </main>
}
