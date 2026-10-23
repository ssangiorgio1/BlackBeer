'use client'

import { useEffect, useState } from 'react'
import { Bell, CreditCard, Gift, History, LayoutDashboard, Menu, ShieldCheck, ShoppingBag, Users, X } from 'lucide-react'
import { NfcSection } from '@/components/nfc-section'
import { DevicesSection } from '@/components/devices-section'
import { CajaSection } from '@/components/caja-section'
import { ClientesSection } from '@/components/clientes-section'
import { PremiosSection } from '@/components/premios-section'
import { MovimientosSection } from '@/components/movimientos-section'
import { InicioSection } from '@/components/inicio-section'
import { useDevice } from '@/lib/client'

const navItems = [
  { label: 'Inicio', icon: LayoutDashboard },
  { label: 'Caja', icon: ShoppingBag },
  { label: 'Clientes', icon: Users },
  { label: 'Tarjetas NFC', icon: CreditCard },
  { label: 'Premios', icon: Gift },
  { label: 'Movimientos', icon: History },
]
const ALL = [...navItems.map((n) => n.label), 'Roles y permisos']
const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-')

const ROLE: Record<string, string> = { PARENT: 'Administrador', CHILD: 'Cajero', PENDING: 'Pendiente de autorización', REVOKED: 'Revocado' }

export default function Page() {
  const [active, setActive] = useState('Inicio')
  const [mobileOpen, setMobileOpen] = useState(false)
  const device = useDevice()

  // La sección activa vive en el hash (#caja) para poder abrir el celular de la caja directo ahí.
  useEffect(() => {
    const fromHash = () => { const m = ALL.find((l) => slug(l) === location.hash.slice(1)); if (m) setActive(m) }
    fromHash(); window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [])
  const go = (label: string) => { setActive(label); setMobileOpen(false); history.replaceState(null, '', `#${slug(label)}`) }

  const navBtn = (label: string, Icon: typeof Users) => <button key={label} onClick={() => go(label)} className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[13px] font-semibold ${active === label ? 'bg-[#F6D525] text-[#1E1E1E]' : 'text-white/55 hover:bg-white/10 hover:text-white'}`}><Icon size={17} />{label}</button>

  return <main className="min-h-screen bg-[#E6E3DD] text-[#1E1E1E]">
    <aside className={`fixed inset-y-0 left-0 z-30 flex w-[250px] flex-col bg-[#1E1E1E] px-5 py-6 text-white transition-transform lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="mb-10 flex items-center justify-between px-2">
        <img src="/blackbeer-logo.png" alt="Blackbeer" className="h-12 w-auto" />
        <button className="lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú"><X /></button>
      </div>
      <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-white/35">Operación</p>
      <nav className="flex flex-col gap-1">{navItems.map(({ label, icon }) => navBtn(label, icon))}</nav>
      <p className="mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-white/35">Control</p>
      {navBtn('Roles y permisos', ShieldCheck)}
      <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">Este dispositivo</p>
        <p className="mt-1 text-xs font-bold">{ROLE[device.status] ?? '…'}</p>
        <p className="mt-0.5 truncate text-[10px] text-white/40">{device.deviceId}</p>
      </div>
    </aside>

    <section className="lg:pl-[250px]">
      <header className="flex h-[76px] items-center border-b border-black/[.07] bg-[#E6E3DD]/90 px-5 backdrop-blur-md sm:px-8">
        <button className="rounded-lg p-2 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menú"><Menu /></button>
        <div className="hidden items-center gap-2 text-xs font-semibold text-black/40 sm:flex"><span>Blackbeer</span><span>/</span><span className="text-black">{active}</span></div>
        <div className="ml-auto flex items-center gap-3">
          <button aria-label="Notificaciones" className="rounded-xl border border-black/10 bg-white p-2.5"><Bell size={17} /></button>
          <span className="flex size-9 items-center justify-center rounded-full bg-[#E385A4] text-xs font-black">BB</span>
        </div>
      </header>
      {active === 'Inicio' && <InicioSection />}
      {active === 'Caja' && <CajaSection />}
      {active === 'Clientes' && <ClientesSection />}
      {active === 'Tarjetas NFC' && <NfcSection onBack={() => go('Inicio')} />}
      {active === 'Premios' && <PremiosSection />}
      {active === 'Movimientos' && <MovimientosSection />}
      {active === 'Roles y permisos' && <DevicesSection />}
    </section>
  </main>
}
