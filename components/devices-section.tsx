'use client'

import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck, Smartphone } from 'lucide-react'
import { api, Device, useDevice } from '@/lib/client'

const BADGE: Record<string, string> = { PARENT: 'bg-[#F6D525]', CHILD: 'bg-[#bdf3d3]', PENDING: 'bg-[#F4B6C9]', REVOKED: 'bg-[#E385A4]' }

export function DevicesSection() {
  const me = useDevice()
  const [devices, setDevices] = useState<Device[]>([])
  const [error, setError] = useState('')
  const [code, setCode] = useState('')
  const load = useCallback(() => me.deviceId ? api<Device[]>(`/api/nfc/devices?deviceId=${encodeURIComponent(me.deviceId)}`).then(setDevices).catch(() => {}) : Promise.resolve(), [me.deviceId])
  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t) }, [load])

  const claim = async () => {
    setError('')
    try { await api('/api/nfc/devices/claim', { method: 'POST', body: JSON.stringify({ deviceId: me.deviceId, code }) }); setCode(''); await me.refresh(); load() }
    catch (e: any) { setError(e.message) }
  }

  const setStatus = async (d: Device, status: string) => {
    setError('')
    try { await api(`/api/nfc/devices/${d.id}`, { method: 'PATCH', body: JSON.stringify({ status, actorDeviceId: me.deviceId }) }); load() }
    catch (e: any) { setError(e.message) }
  }
  const reset = async () => {
    if (!confirm('Esto borra clientes, canjes y dispositivos y vuelve a los datos de ejemplo. ¿Seguro?')) return
    try { await api('/api/demo/reset', { method: 'POST', body: JSON.stringify({ deviceId: me.deviceId }) }) } catch (e: any) { setError(e.message); return }
    localStorage.removeItem('bb-device-id'); location.reload()
  }
  const isParent = me.status === 'PARENT'
  const btn = 'rounded-lg border-2 border-black/15 px-3 py-1.5 text-[11px] font-black hover:bg-black hover:text-white'

  return <div className="mx-auto max-w-[1450px] px-5 py-10 sm:px-8 lg:px-10">
    <p className="text-[11px] font-black uppercase tracking-[.22em] text-[#D9628A]">Control de acceso</p>
    <h1 className="mt-2 text-4xl font-black tracking-[-.06em] sm:text-5xl">Roles y <span className="text-[#D9628A]">permisos</span></h1>
    <p className="mt-2 max-w-xl text-sm font-medium text-black/45">Solo los dispositivos autorizados pueden vincular chips NFC. El primer dispositivo en registrarse es el administrador (PARENT); los demás quedan pendientes hasta que lo apruebes.</p>
    <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-bold"><ShieldCheck size={13} />Este dispositivo: {me.deviceId} · {me.status || '…'}</p>
    {error && <p className="mt-4 rounded-xl bg-[#E385A4]/40 px-4 py-3 text-xs font-semibold">{error}</p>}

    <div className="mt-8 flex flex-col gap-3">
      {devices.length === 0 && <p className="text-sm text-black/40">Todavía no hay dispositivos registrados.</p>}
      {devices.map((d) => <div key={d.id} className="flex flex-wrap items-center gap-4 rounded-2xl bg-white p-4">
        <span className={`flex size-11 items-center justify-center rounded-xl ${BADGE[d.status]}`}><Smartphone size={18} /></span>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{d.deviceName}{d.deviceId === me.deviceId && <span className="ml-2 text-[10px] text-[#D9628A]">(este dispositivo)</span>}</p><p className="text-[11px] font-semibold text-black/40">{d.deviceId} · {new Date(d.createdAt).toLocaleString('es-AR')}</p></div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-black ${BADGE[d.status]}`}>{d.status}</span>
        {isParent && d.deviceId !== me.deviceId && <div className="flex gap-2">
          {d.status === 'PENDING' && <button className={btn} onClick={() => setStatus(d, 'CHILD')}>Autorizar</button>}
          {d.status === 'CHILD' && <button className={btn} onClick={() => setStatus(d, 'PARENT')}>Promover</button>}
          {d.status !== 'REVOKED' && <button className={btn} onClick={() => setStatus(d, 'REVOKED')}>{d.status === 'PENDING' ? 'Rechazar' : 'Revocar'}</button>}
          {d.status === 'REVOKED' && <button className={btn} onClick={() => setStatus(d, 'CHILD')}>Reactivar</button>}
        </div>}
      </div>)}
    </div>
    {!isParent && me.status && <div className="mt-6 rounded-2xl bg-[#F6D525] p-5">
      <p className="text-sm font-black">¿Sos el administrador?</p>
      <p className="mt-1 text-xs font-semibold text-black/60">Solo un dispositivo PARENT puede autorizar, revocar o reiniciar. Si tenés el código de administrador, reclamá el rol desde este dispositivo.</p>
      <div className="mt-3 flex gap-2"><input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && code && claim()} type="password" placeholder="Código de administrador" className="min-w-0 flex-1 rounded-xl border-2 border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-black" /><button onClick={claim} disabled={!code} className="rounded-xl bg-[#1E1E1E] px-5 text-xs font-black text-white shadow-[4px_4px_0_#E385A4] disabled:opacity-40">Reclamar</button></div>
    </div>}
    {isParent && <button onClick={reset} className="mt-10 text-[11px] font-black uppercase tracking-widest text-black/30 hover:text-[#D9628A]">Reiniciar demo</button>}
  </div>
}
