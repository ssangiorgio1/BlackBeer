'use client'

import { useCallback, useEffect, useState } from 'react'
import { CreditCard, Link2, Plus, Radio, RotateCw, X } from 'lucide-react'
import { CardDesign, DESIGNS, hasOwnFlip, NfcCard3D } from '@/components/nfc-card-3d'
import { api, CardView, fmt, useDevice, useNfcReader, useNfcWriter } from '@/lib/client'

const COLORS = ['bg-[#E385A4]', 'bg-[#F6D525]', 'bg-[#F4B6C9]', 'bg-[#bdf3d3]']
const initials = (name: string) => name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

export function NfcSection({ onBack }: { onBack: () => void }) {
  const device = useDevice()
  const [cards, setCards] = useState<CardView[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [modal, setModal] = useState<'link' | 'new' | null>(null)
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)
  const [linkCardId, setLinkCardId] = useState('')
  const [uidInput, setUidInput] = useState('')
  const [newName, setNewName] = useState('')
  const [design, setDesign] = useState<CardDesign>('D')
  const [flipped, setFlipped] = useState(false)

  const say = (ok: boolean, text: string) => { setToast({ ok, text }); setTimeout(() => setToast(null), 4500) }
  const load = useCallback(async () => {
    const c = await api<CardView[]>('/api/tarjetas')
    setCards(c); setSelectedId((cur) => cur || c[0]?.id || '')
  }, [])
  useEffect(() => { load().catch(() => say(false, 'No se pudo cargar la información')) }, [load])

  const selected = cards.find((c) => c.id === selectedId)
  const colorOf = (id: string) => COLORS[Math.max(0, cards.findIndex((c) => c.id === id)) % COLORS.length]

  const writer = useNfcWriter()
  const writeUrl = async () => {
    if (!selected) return
    if (await writer.write(`${window.location.origin}/c/${selected.token}`)) say(true, 'URL grabada en el chip ✓')
  }
  const reader = useNfcReader(async (uid) => {
    if (modal === 'link') { setUidInput(uid); return }
    try {
      const card = await api<CardView>(`/api/tarjetas/lookup?nfcUid=${encodeURIComponent(uid)}&touch=1`)
      await load(); setSelectedId(card.id); say(true, `Tarjeta de ${card.customer.name} identificada`)
    } catch { say(false, `Chip ${uid} sin vincular. Usá "Vincular tarjeta".`); setUidInput(uid) }
  })

  const lookupManual = async () => {
    const v = uidInput.trim(); if (!v) return
    try {
      const card = await api<CardView>(`/api/tarjetas/lookup?${/^[0-9a-f:\s-]+$/i.test(v) && v.length > 8 ? 'nfcUid' : 'barcode'}=${encodeURIComponent(v)}&touch=1`)
      await load(); setSelectedId(card.id); say(true, `Tarjeta de ${card.customer.name} identificada`)
    } catch { say(false, 'No hay ninguna tarjeta con ese código') }
  }

  const doLink = async (overwrite = false) => {
    try {
      await api(`/api/tarjetas/${linkCardId}/nfc`, { method: 'PATCH', body: JSON.stringify({ nfcUid: uidInput, deviceId: device.deviceId, overwrite }) })
      await load(); setSelectedId(linkCardId); setModal(null); setUidInput(''); reader.stop(); say(true, 'Chip vinculado correctamente ✓')
    } catch (e: any) {
      if (e.data?.needsOverwrite && confirm('Esta tarjeta ya tiene un chip. ¿Reemplazarlo?')) return doLink(true)
      say(false, e.message)
    }
  }

  const createCard = async () => {
    try {
      const card = await api<CardView>('/api/tarjetas', { method: 'POST', body: JSON.stringify({ name: newName }) })
      await load(); setSelectedId(card.id); setNewName(''); setModal(null); say(true, `Tarjeta ${card.barcode} creada para ${card.customer.name}`)
    } catch (e: any) { say(false, e.message) }
  }

  const openLink = () => { setLinkCardId(selected?.id ?? cards[0]?.id ?? ''); setModal('link') }
  const input = 'w-full rounded-xl border-2 border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-black'

  return <div className="mx-auto max-w-[1450px] px-5 py-7 sm:px-8 lg:px-10">
    {toast && <div className={`fixed right-5 top-5 z-50 max-w-sm rounded-2xl px-5 py-4 text-sm font-bold shadow-[4px_4px_0_#1E1E1E] ${toast.ok ? 'bg-[#bdf3d3]' : 'bg-[#E385A4]'}`}>{toast.text}</div>}

    <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
      <div>
        <button onClick={onBack} className="mb-5 text-[11px] font-black uppercase tracking-[.16em] text-black/40 hover:text-[#D9628A]">← Volver al inicio</button>
        <p className="mb-2 text-[11px] font-black uppercase tracking-[.22em] text-[#D9628A]">Centro de identificación</p>
        <h1 className="text-4xl font-black tracking-[-.06em] sm:text-5xl">Tarjetas <span className="text-[#D9628A]">NFC</span></h1>
        <p className="mt-2 max-w-xl text-sm font-medium text-black/45">Acercá una tarjeta para identificar al cliente, o vinculá un chip nuevo a una tarjeta del sistema.</p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-bold"><span className={`size-2 rounded-full ${device.authorized ? 'bg-green-500' : 'bg-[#D9628A]'}`} />Este dispositivo: {device.status || '…'}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button onClick={reader.scanning ? reader.stop : reader.start} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold ${reader.scanning ? 'bg-[#D9628A] text-white' : 'bg-[#F6D525]'}`}><Radio size={16} className={reader.scanning ? 'animate-pulse' : ''} />{reader.scanning ? 'Esperando tarjeta… (cancelar)' : 'Leer tarjeta NFC'}</button>
        <button onClick={() => setModal('new')} className="flex items-center gap-2 rounded-xl border-2 border-black/15 px-4 py-3 text-xs font-bold hover:bg-black hover:text-white"><Plus size={16} />Nueva tarjeta</button>
        <button onClick={openLink} disabled={!device.authorized} className="flex items-center gap-2 rounded-xl bg-[#1E1E1E] px-4 py-3 text-xs font-bold text-white shadow-[4px_4px_0_#E385A4] disabled:opacity-40"><Link2 size={16} />Vincular tarjeta</button>
      </div>
    </div>

    {reader.error && <p className="mb-4 rounded-xl bg-[#E385A4]/40 px-4 py-3 text-xs font-semibold">{reader.error}</p>}
    {device.status && !device.authorized && <p className="mb-4 rounded-xl bg-[#F6D525] px-4 py-3 text-xs font-bold">Este dispositivo ({device.deviceId}) está {device.status === 'REVOKED' ? 'revocado' : 'pendiente de autorización'}: pedile al administrador que lo apruebe en “Roles y permisos”. Mientras tanto no puede vincular chips.</p>}

    <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
      <section className="overflow-hidden rounded-[28px] bg-[#1E1E1E] p-6 text-white sm:p-8">
        {selected ? <>
          <div className="flex items-start justify-between"><div><span className="mb-4 inline-flex rounded-full bg-[#F6D525] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black">Vista previa 3D</span><h2 className="text-2xl font-black">Tarjeta de {selected.customer.name.split(' ')[0]}</h2><p className="mt-1 text-sm text-white/45">Pasá el cursor para explorarla</p></div><div className="rounded-xl bg-white/10 p-3"><CreditCard className="text-[#E385A4]" /></div></div>
          <div className="mt-3"><NfcCard3D design={design} flipped={flipped} customer={{ name: selected.customer.name, points: selected.customer.points, barcode: selected.barcode }} /></div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{DESIGNS.map((d) => <button key={d.id} onClick={() => setDesign(d.id)} className={`rounded-full px-3 py-1.5 text-[11px] font-black ${design === d.id ? 'bg-[#F6D525] text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>{d.id} · {d.name}</button>)}{!hasOwnFlip(design) && <button onClick={() => setFlipped((v) => !v)} className="flex items-center gap-1.5 rounded-full border border-white/25 px-3 py-1.5 text-[11px] font-black hover:bg-white/10"><RotateCw size={12} />{flipped ? 'Ver frente' : 'Ver dorso'}</button>}{design === 'F' && <span className="w-full text-center text-[11px] font-semibold text-white/40">Tocá la tarjeta para darla vuelta</span>}</div>
          <div className="mb-6 mt-5 flex items-end justify-between rounded-2xl bg-white/5 px-5 py-4"><div><p className="text-[10px] font-black uppercase tracking-widest text-white/35">{selected.barcode}</p><p className="mt-1 text-xl font-black">{selected.customer.name}</p></div><div className="text-right"><p className="text-3xl font-black text-[#F6D525]">{fmt(selected.customer.points)}</p><p className="text-[10px] font-black uppercase tracking-widest text-white/35">puntos</p></div></div>
          <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-5">
            <div><p className="text-[10px] uppercase tracking-widest text-white/35">Estado</p><p className={`mt-1 text-sm font-black ${selected.nfcUid ? 'text-[#bdf3d3]' : 'text-[#F6D525]'}`}>{selected.nfcUid ? 'Vinculada' : 'Sin chip'}</p></div>
            <div><p className="text-[10px] uppercase tracking-widest text-white/35">Último uso</p><p className="mt-1 text-sm font-black">{selected.lastUsedAt ? new Date(selected.lastUsedAt).toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—'}</p></div>
            <div><p className="text-[10px] uppercase tracking-widest text-white/35">UID del chip</p><p className="mt-1 break-all text-xs font-black">{selected.nfcUid ?? '—'}</p></div>
          </div>
          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Página del cliente</p>
            <p className="mt-1 text-xs text-white/50">Grabá en el chip el link de su página: así cualquier celular (iPhone incluido) que acerque la tarjeta ve sus puntos y premios. Se necesita un Android con Chrome.</p>
            <p className="mt-2 break-all rounded-lg bg-white/5 px-3 py-2 text-[11px] font-semibold text-white/60">{typeof window !== 'undefined' ? window.location.origin : ''}/c/{selected.token}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={writer.writing ? writer.cancel : writeUrl} disabled={!device.authorized} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black disabled:opacity-40 ${writer.writing ? 'bg-[#D9628A] text-white' : 'bg-[#F6D525] text-black'}`}><Radio size={14} className={writer.writing ? 'animate-pulse' : ''} />{writer.writing ? 'Acercá el chip… (cancelar)' : 'Grabar URL en el chip'}</button>
              <a href={`/c/${selected.token}`} target="_blank" className="rounded-xl border border-white/25 px-4 py-2.5 text-xs font-black hover:bg-white/10">Ver página del cliente</a>
            </div>
            {writer.error && <p className="mt-2 text-[11px] font-semibold text-[#E385A4]">{writer.error}</p>}
          </div>
        </> : <p className="py-20 text-center text-white/50">Cargando…</p>}
      </section>

      <section className="rounded-[28px] bg-[#F6D525] p-6 sm:p-8">
        <div className="mb-6 flex items-start justify-between"><div><p className="text-[11px] font-black uppercase tracking-[.18em] text-black/45">Tarjetas del club</p><h2 className="mt-2 text-2xl font-black">Seleccioná una</h2></div><span className="rounded-full bg-black px-3 py-1 text-[10px] font-black text-[#F6D525]">{cards.filter((c) => c.nfcUid).length}/{cards.length} con chip</span></div>
        <div className="flex max-h-[420px] flex-col gap-3 overflow-y-auto">{cards.map((c) => <button key={c.id} onClick={() => setSelectedId(c.id)} className={`flex items-center gap-3 rounded-2xl p-3 text-left transition ${selectedId === c.id ? 'bg-black text-white' : 'bg-white/50 hover:bg-white'}`}><span className={`flex size-10 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-black ${selectedId === c.id ? 'bg-[#E385A4]' : colorOf(c.id)}`}>{initials(c.customer.name)}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-black">{c.customer.name}</span><span className={`block text-[10px] font-semibold ${selectedId === c.id ? 'text-white/45' : 'text-black/40'}`}>{c.barcode} · {fmt(c.customer.points)} pts</span></span><span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${c.nfcUid ? 'bg-[#bdf3d3] text-black' : 'bg-black/10'}`}>{c.nfcUid ? 'NFC' : 'sin chip'}</span></button>)}</div>
        <div className="mt-5 flex gap-2"><input value={uidInput} onChange={(e) => setUidInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && lookupManual()} placeholder="Buscar por código o UID" className="min-w-0 flex-1 rounded-xl bg-white/60 px-4 py-3 text-xs font-semibold outline-none" /><button onClick={lookupManual} className="rounded-xl bg-black px-4 text-xs font-black text-white">Buscar</button></div>
      </section>
    </div>

    {modal && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-5" onClick={() => { setModal(null); reader.stop() }}>
      <div className="w-full max-w-md rounded-[28px] bg-[#E6E3DD] p-7" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between"><h3 className="text-2xl font-black">{modal === 'link' ? 'Vincular chip NFC' : 'Nueva tarjeta'}</h3><button onClick={() => { setModal(null); reader.stop() }} aria-label="Cerrar"><X /></button></div>
        {modal === 'new' ? <>
          <p className="mb-3 text-xs font-semibold text-black/50">Crea un cliente con una tarjeta nueva (código automático). Después le vinculás el chip.</p>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre del cliente" className={input} />
          <button onClick={createCard} disabled={!newName.trim()} className="mt-4 w-full rounded-xl bg-[#1E1E1E] py-3 text-sm font-bold text-white shadow-[4px_4px_0_#E385A4] disabled:opacity-40">Crear tarjeta</button>
        </> : <>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-black/45">Tarjeta del sistema</label>
          <select value={linkCardId} onChange={(e) => setLinkCardId(e.target.value)} className={input}>{cards.map((c) => <option key={c.id} value={c.id}>{c.barcode} — {c.customer.name}{c.nfcUid ? ' (ya tiene chip)' : ''}</option>)}</select>
          <label className="mb-1 mt-4 block text-[10px] font-black uppercase tracking-widest text-black/45">UID del chip</label>
          <input value={uidInput} onChange={(e) => setUidInput(e.target.value)} placeholder="04:A3:B2:C1:D0:E9:F1" className={input} />
          <button onClick={reader.scanning ? reader.stop : reader.start} className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-black ${reader.scanning ? 'bg-[#D9628A] text-white' : 'bg-[#F6D525]'}`}><Radio size={15} className={reader.scanning ? 'animate-pulse' : ''} />{reader.scanning ? 'Acercá el chip al celular…' : 'Leer UID con NFC'}</button>
          {reader.error && <p className="mt-2 text-[11px] font-semibold text-[#D9628A]">{reader.error}</p>}
          <button onClick={() => doLink()} disabled={!uidInput.trim() || !linkCardId} className="mt-4 w-full rounded-xl bg-[#1E1E1E] py-3 text-sm font-bold text-white shadow-[4px_4px_0_#E385A4] disabled:opacity-40">Vincular ✓</button>
        </>}
      </div>
    </div>}
  </div>
}
