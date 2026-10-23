'use client'

import { useCallback, useEffect, useState } from 'react'
import { Gift, Plus } from 'lucide-react'
import { api, fmt, Reward, useDevice } from '@/lib/client'

export function PremiosSection() {
  const me = useDevice()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [name, setName] = useState('')
  const [cost, setCost] = useState('')
  const [error, setError] = useState('')
  const load = useCallback(() => api<Reward[]>('/api/productos?all=1').then(setRewards).catch(() => {}), [])
  useEffect(() => { load() }, [load])
  const isParent = me.status === 'PARENT'

  const run = async (fn: () => Promise<unknown>) => { setError(''); try { await fn(); await load() } catch (e: any) { setError(e.message) } }
  const create = () => run(async () => { await api('/api/productos', { method: 'POST', body: JSON.stringify({ name, cost, deviceId: me.deviceId }) }); setName(''); setCost('') })
  const patch = (id: string, body: object) => run(() => api(`/api/productos/${id}`, { method: 'PATCH', body: JSON.stringify({ ...body, deviceId: me.deviceId }) }))
  const input = 'rounded-xl border-2 border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-black'

  return <div className="mx-auto max-w-[1450px] px-5 py-10 sm:px-8 lg:px-10">
    <p className="text-[11px] font-black uppercase tracking-[.22em] text-[#D9628A]">Catálogo del club</p>
    <h1 className="mt-2 text-4xl font-black tracking-[-.06em] sm:text-5xl">Pre<span className="text-[#D9628A]">mios</span></h1>
    <p className="mt-2 max-w-xl text-sm font-medium text-black/45">Lo que los clientes pueden canjear con sus puntos. Los cambios se ven al instante en la caja y en la página del cliente.</p>
    {!isParent && me.status && <p className="mt-4 rounded-xl bg-[#F6D525] px-4 py-3 text-xs font-bold">Solo el administrador (dispositivo PARENT) puede editar premios.</p>}
    {error && <p className="mt-4 rounded-xl bg-[#E385A4]/40 px-4 py-3 text-xs font-semibold">{error}</p>}

    <div className="mt-8 flex flex-col gap-3">{rewards.map((r) => <div key={r.id} className={`flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 ${r.active ? '' : 'opacity-50'}`}>
      <span className="flex size-11 items-center justify-center rounded-xl bg-[#F6D525]"><Gift size={18} /></span>
      <input defaultValue={r.name} disabled={!isParent} onBlur={(e) => e.target.value !== r.name && patch(r.id, { name: e.target.value })} className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-2 text-sm font-black outline-none enabled:hover:bg-black/5 enabled:focus:bg-black/5" />
      <div className="flex items-center gap-1"><input defaultValue={r.cost} disabled={!isParent} inputMode="numeric" onBlur={(e) => Number(e.target.value) !== r.cost && patch(r.id, { cost: e.target.value })} className="w-20 rounded-lg bg-transparent px-2 py-2 text-right text-sm font-black outline-none enabled:hover:bg-black/5 enabled:focus:bg-black/5" /><span className="text-xs font-bold text-black/40">pts</span></div>
      <button disabled={!isParent} onClick={() => patch(r.id, { active: !r.active })} className="rounded-lg border-2 border-black/15 px-3 py-1.5 text-[11px] font-black enabled:hover:bg-black enabled:hover:text-white disabled:opacity-40">{r.active ? 'Desactivar' : 'Activar'}</button>
    </div>)}</div>

    <div className="mt-6 flex flex-wrap gap-3 rounded-2xl bg-[#F6D525] p-4">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del premio" disabled={!isParent} className={`${input} min-w-0 flex-1`} />
      <input value={cost} onChange={(e) => setCost(e.target.value.replace(/\D/g, ''))} placeholder="Costo en puntos" inputMode="numeric" disabled={!isParent} className={`${input} w-40`} />
      <button onClick={create} disabled={!isParent || !name.trim() || !cost} className="flex items-center gap-2 rounded-xl bg-[#1E1E1E] px-5 py-3 text-xs font-black text-white shadow-[4px_4px_0_#E385A4] disabled:opacity-40"><Plus size={15} />Agregar premio</button>
    </div>
    <p className="mt-3 text-xs font-semibold text-black/40">Cada premio vale {fmt(1)} punto por cada $1 gastado: un premio de 400 pts equivale a $400 en compras.</p>
  </div>
}
