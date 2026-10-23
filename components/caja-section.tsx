'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, Check, Gift, Plus, Radio, Search, UserRound } from 'lucide-react'
import { api, CardView, fmt, fmtDate, Movement, Reward, useDevice, useNfcReader } from '@/lib/client'
import { MovementList } from '@/components/movimientos-section'
import { NfcDiagnostics } from '@/components/nfc-diagnostics'

type Step = 'idle' | 'card' | 'done'
type Receipt = { tx: Movement; customerName: string }

export function CajaSection() {
  const device = useDevice()
  const [step, setStep] = useState<Step>('idle')
  const [card, setCard] = useState<CardView | null>(null)
  const [rewards, setRewards] = useState<Reward[]>([])
  const [recent, setRecent] = useState<Movement[]>([])
  const [tab, setTab] = useState<'earn' | 'redeem'>('redeem')
  const [amount, setAmount] = useState('')
  const [pending, setPending] = useState<Reward | null>(null)
  const [manual, setManual] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [receipt, setReceipt] = useState<Receipt | null>(null)

  const loadRecent = useCallback(() => api<Movement[]>('/api/movimientos?limit=8').then(setRecent).catch(() => {}), [])
  useEffect(() => { api<Reward[]>('/api/productos').then((r) => setRewards(r.sort((a, b) => a.cost - b.cost))).catch(() => {}); loadRecent() }, [loadRecent])

  const show = (c: CardView) => { setCard(c); setStep('card'); setAmount(''); setPending(null); setMsg(null) }
  const lookup = async (query: string) => {
    const isUid = /^[0-9a-f]{2}([:\-\s]?[0-9a-f]{2}){3,}$/i.test(query.trim()) && !/^nfc-/i.test(query.trim())
    try { show(await api<CardView>(`/api/tarjetas/lookup?${isUid ? 'nfcUid' : 'barcode'}=${encodeURIComponent(query.trim())}&touch=1`)); setManual('') }
    catch { setMsg({ ok: false, text: isUid ? `Ese chip (${query}) todavía no está vinculado a ninguna tarjeta. Vinculalo en “Tarjetas NFC”.` : 'No hay ninguna tarjeta con ese código.' }) }
  }
  const reader = useNfcReader((uid) => lookup(uid))

  const refreshCard = async (id: string) => setCard(await api<CardView>(`/api/tarjetas/lookup?barcode=${encodeURIComponent((card?.barcode ?? id))}`))

  const finish = async (tx: Movement) => {
    setReceipt({ tx, customerName: card!.customer.name }); setStep('done'); setPending(null); loadRecent()
  }
  const earn = async () => {
    if (!card) return
    setBusy(true); setMsg(null)
    try { const r = await api('/api/puntos', { method: 'POST', body: JSON.stringify({ customerId: card.customer.id, amount, deviceId: device.deviceId }) }); await finish(r.transaction) }
    catch (e: any) { setMsg({ ok: false, text: e.message }) } finally { setBusy(false) }
  }
  const redeem = async () => {
    if (!card || !pending) return
    setBusy(true); setMsg(null)
    try { const r = await api('/api/canjear', { method: 'POST', body: JSON.stringify({ customerId: card.customer.id, productId: pending.id, deviceId: device.deviceId }) }); await finish(r.transaction) }
    catch (e: any) { setMsg({ ok: false, text: e.message }); setPending(null); await refreshCard(card.id) } finally { setBusy(false) }
  }

  const next = () => { setStep('idle'); setCard(null); setReceipt(null); setMsg(null); if (reader.supported) reader.start() }
  const same = async () => { if (card) { await refreshCard(card.id); setStep('card'); setReceipt(null); setAmount('') } }

  const points = card?.customer.points ?? 0
  const nextReward = rewards.find((r) => r.cost > points)
  const earnN = Math.floor(Number(amount)) || 0
  const blocked = device.status !== '' && !device.authorized
  const box = 'rounded-[28px] p-6 sm:p-8'

  return <div className="mx-auto max-w-[1450px] px-5 py-7 sm:px-8 lg:px-10">
    <p className="mb-2 text-[11px] font-black uppercase tracking-[.22em] text-[#D9628A]">Punto de venta</p>
    <h1 className="text-4xl font-black tracking-[-.06em] sm:text-5xl">Caja y <span className="text-[#D9628A]">canjes</span></h1>
    <p className="mt-2 max-w-xl text-sm font-medium text-black/45">Acercá la tarjeta del cliente al celular, sumá puntos por su compra o canjeá un premio. Cada operación queda registrada.</p>

    {blocked && <p className="mt-5 rounded-xl bg-[#F6D525] px-4 py-3 text-xs font-bold">Este dispositivo ({device.deviceId}) está {device.status === 'REVOKED' ? 'revocado' : 'pendiente de autorización'}. Un administrador tiene que aprobarlo en “Roles y permisos” antes de poder operar la caja.</p>}

    <div className="mt-6"><NfcDiagnostics /></div>

    <div className="mt-2 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <section className={`${box} bg-[#1E1E1E] text-white`}>
        {step === 'idle' && <div>
          <div className="flex flex-col items-center py-6 text-center">
            <div className="relative flex size-36 items-center justify-center">
              <span className={`absolute inset-0 rounded-full bg-[#E385A4]/20 ${reader.scanning ? 'animate-ping' : ''}`} />
              <span className="absolute inset-4 rounded-full bg-[#E385A4]/30" />
              <Radio size={44} className="relative text-[#E385A4]" />
            </div>
            <h2 className="mt-6 text-3xl">{reader.scanning ? 'Acercá la tarjeta…' : 'Listo para cobrar'}</h2>
            <p className="mt-2 max-w-sm text-sm text-white/45">{reader.scanning ? 'Apoyá la tarjeta del cliente sobre la parte trasera del celular.' : 'Activá la lectura y apoyá la tarjeta del cliente en el celular.'}</p>
            <button onClick={reader.scanning ? reader.stop : reader.start} disabled={blocked} className={`mt-6 flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-black disabled:opacity-40 ${reader.scanning ? 'bg-white/10' : 'bg-[#F6D525] text-black shadow-[4px_4px_0_#E385A4]'}`}><Radio size={16} />{reader.scanning ? 'Detener lectura' : 'Activar lectura NFC'}</button>
            {reader.error && <p className="mt-3 max-w-sm text-xs font-semibold text-[#E385A4]">{reader.error}</p>}
            <p className="mt-4 max-w-sm rounded-xl bg-white/5 px-4 py-3 text-xs font-semibold text-white/55">¿iPhone, o un Android sin NFC? Apoyá la tarjeta en el celular: se abre la página del cliente y, si este dispositivo está autorizado, arriba aparece el <b className="text-[#F6D525]">modo caja</b> para sumar y canjear.</p>
          </div>
          <div className="border-t border-white/10 pt-5">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-white/35">O buscá manualmente (código impreso o UID del chip)</p>
            <div className="flex gap-2"><input value={manual} onChange={(e) => setManual(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && manual.trim() && lookup(manual)} placeholder="NFC-0024" className="min-w-0 flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold outline-none placeholder:text-white/30" /><button onClick={() => manual.trim() && lookup(manual)} disabled={blocked} className="flex items-center gap-2 rounded-xl bg-[#E385A4] px-5 text-xs font-black text-black disabled:opacity-40"><Search size={14} />Buscar</button></div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/35">Para probar sin NFC: {['NFC-0024', 'NFC-0023', 'NFC-0021'].map((c) => <button key={c} onClick={() => lookup(c)} disabled={blocked} className="rounded-full bg-white/10 px-2.5 py-1 font-bold text-white/70 hover:bg-white/20 disabled:opacity-40">{c}</button>)}</div>
          </div>
          {msg && <p className={`mt-4 rounded-xl px-4 py-3 text-xs font-bold ${msg.ok ? 'bg-[#bdf3d3] text-black' : 'bg-[#E385A4] text-black'}`}>{msg.text}</p>}
        </div>}

        {step === 'card' && card && <div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4"><span className="flex size-14 items-center justify-center rounded-2xl bg-[#E385A4] text-black"><UserRound /></span><div><p className="text-[10px] font-black uppercase tracking-widest text-white/35">{card.barcode}{card.nfcUid ? '' : ' · sin chip'}</p><h2 className="text-3xl leading-none">{card.customer.name}</h2></div></div>
            <button onClick={next} className="shrink-0 rounded-lg border border-white/20 px-3 py-2 text-[11px] font-black hover:bg-white/10">Cambiar cliente</button>
          </div>
          <div className="mt-6 rounded-2xl bg-white/5 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/35">Saldo actual</p>
            <p className="mt-1 text-6xl font-black text-[#F6D525]">{fmt(points)}<span className="ml-2 text-lg text-white/40">puntos</span></p>
            {nextReward ? <div className="mt-4"><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#E385A4]" style={{ width: `${Math.min(100, (points / nextReward.cost) * 100)}%` }} /></div><p className="mt-2 text-xs font-semibold text-white/45">Le faltan <b className="text-white">{fmt(nextReward.cost - points)}</b> para “{nextReward.name}”</p></div> : <p className="mt-3 text-xs font-semibold text-[#bdf3d3]">Ya alcanza todos los premios 🎉</p>}
          </div>

          <div className="mt-6 flex gap-2">{(['redeem', 'earn'] as const).map((t) => <button key={t} onClick={() => { setTab(t); setPending(null); setMsg(null) }} className={`flex-1 rounded-xl py-3 text-sm font-black ${tab === t ? 'bg-[#F6D525] text-black' : 'bg-white/10 text-white/70 hover:bg-white/15'}`}>{t === 'redeem' ? 'Canjear premio' : 'Sumar puntos'}</button>)}</div>

          {tab === 'earn' && <div className="mt-5">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-white/35">Monto de la compra ($1 = 1 punto)</p>
            <div className="flex gap-2"><input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="0" className="min-w-0 flex-1 rounded-xl bg-white/10 px-4 py-4 text-2xl font-black outline-none placeholder:text-white/20" /></div>
            <div className="mt-2 flex gap-2">{[1000, 2000, 5000, 10000].map((n) => <button key={n} onClick={() => setAmount(String(n))} className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold hover:bg-white/20">${fmt(n)}</button>)}</div>
            {earnN > 0 && <p className="mt-4 text-sm font-semibold text-white/60">{fmt(points)} <ArrowRight size={12} className="mx-1 inline" /> <b className="text-[#F6D525]">{fmt(points + earnN)}</b> puntos <span className="text-[#bdf3d3]">(+{fmt(earnN)})</span></p>}
            <button onClick={earn} disabled={busy || earnN <= 0 || blocked} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#E385A4] py-4 text-sm font-black text-black shadow-[4px_4px_0_#F6D525] disabled:opacity-40"><Plus size={16} />Sumar {earnN > 0 ? fmt(earnN) : ''} puntos</button>
          </div>}

          {tab === 'redeem' && <div className="mt-5 flex flex-col gap-2">
            {rewards.map((r) => { const ok = points >= r.cost; return <button key={r.id} disabled={!ok || blocked} onClick={() => { setPending(r); setMsg(null) }} className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-left ${pending?.id === r.id ? 'bg-[#F6D525] text-black' : ok ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5 opacity-50'}`}><Gift size={18} className={pending?.id === r.id ? '' : 'text-[#F6D525]'} /><span className="flex-1 text-sm font-bold">{r.name}</span><span className="text-right text-xs font-black">{fmt(r.cost)} pts<span className={`block text-[10px] font-semibold ${pending?.id === r.id ? 'text-black/60' : ok ? 'text-[#bdf3d3]' : 'text-white/40'}`}>{ok ? 'Disponible' : `Le faltan ${fmt(r.cost - points)}`}</span></span></button> })}
            {rewards.length === 0 && <p className="text-sm text-white/40">No hay premios activos. Crealos en “Premios”.</p>}
            {pending && <div className="mt-3 rounded-2xl border-2 border-[#F6D525] p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#F6D525]">Confirmar canje</p>
              <p className="mt-1 text-xl font-black">{pending.name}</p>
              <p className="mt-2 text-sm text-white/60">{card.customer.name}: {fmt(points)} <ArrowRight size={12} className="mx-1 inline" /> <b className="text-white">{fmt(points - pending.cost)}</b> puntos <span className="text-[#E385A4]">(−{fmt(pending.cost)})</span></p>
              <div className="mt-4 flex gap-2"><button onClick={() => setPending(null)} className="flex-1 rounded-xl border border-white/20 py-3 text-sm font-black hover:bg-white/10">Cancelar</button><button onClick={redeem} disabled={busy} className="flex-[2] rounded-xl bg-[#F6D525] py-3 text-sm font-black text-black disabled:opacity-50">Confirmar canje ✓</button></div>
            </div>}
          </div>}
          {msg && <p className={`mt-4 rounded-xl px-4 py-3 text-xs font-bold ${msg.ok ? 'bg-[#bdf3d3] text-black' : 'bg-[#E385A4] text-black'}`}>{msg.text}</p>}
        </div>}

        {step === 'done' && receipt && <div className="text-center">
          <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-[#bdf3d3] text-black"><Check size={40} strokeWidth={3} /></span>
          <h2 className="mt-5 text-4xl">{receipt.tx.type === 'REDEEM' ? 'Canje realizado' : 'Puntos sumados'}</h2>
          <div className="mx-auto mt-6 max-w-md rounded-2xl bg-white/5 p-5 text-left text-sm">
            {([['Cliente', receipt.customerName], ['Detalle', receipt.tx.detail], ['Puntos', `${receipt.tx.type === 'REDEEM' ? '−' : '+'}${fmt(receipt.tx.points)}`], ['Saldo', `${fmt(receipt.tx.before)} → ${fmt(receipt.tx.after)}`], ['Fecha', fmtDate(receipt.tx.createdAt)], ['Dispositivo', receipt.tx.deviceName], ['Comprobante', `#${receipt.tx.id}`]] as const).map(([k, v]) => <div key={k} className="flex justify-between gap-4 border-b border-white/10 py-2 last:border-0"><span className="text-white/40">{k}</span><span className="text-right font-bold">{v}</span></div>)}
          </div>
          <div className="mx-auto mt-6 flex max-w-md gap-2"><button onClick={same} className="flex-1 rounded-xl border border-white/20 py-3.5 text-sm font-black hover:bg-white/10">Mismo cliente</button><button onClick={next} className="flex-[1.4] rounded-xl bg-[#F6D525] py-3.5 text-sm font-black text-black shadow-[4px_4px_0_#E385A4]">Siguiente cliente →</button></div>
        </div>}
      </section>

      <section className={`${box} bg-[#F6D525]`}>
        <p className="text-[11px] font-black uppercase tracking-[.18em] text-black/45">Actividad de la caja</p>
        <h2 className="mb-5 mt-2 text-2xl">Últimos movimientos</h2>
        <MovementList rows={recent} compact />
      </section>
    </div>
  </div>
}
