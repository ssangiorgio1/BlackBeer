'use client'

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import QRCode from 'qrcode'
import ReflectiveCard from '@/components/ReflectiveCard'
import HoloCard from '@/components/HoloCard'

// A–D: propuestas de tarjeta física (PDF). E y F: tarjetas digitales con efectos WebGL (React Bits).
export type CardDesign = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
export const DESIGNS: { id: CardDesign; name: string }[] = [
  { id: 'A', name: 'Arena rosa' },
  { id: 'B', name: 'Sello clásico' },
  { id: 'C', name: 'Pop sticker' },
  { id: 'D', name: 'Arena + sticker' },
  { id: 'E', name: 'Metal reflectivo' },
  { id: 'F', name: 'Holo coleccionable' },
]
// E y F traen su propio giro/inclinación, así que no usan el botón "Ver dorso" (la F se da vuelta tocándola).
export const hasOwnFlip = (d: CardDesign) => d === 'E' || d === 'F'
export type CardCustomer = { name: string; points: number; barcode: string }

// QR de muestra (provisorio hasta tener el link real del Linktree)
const QR_URL = 'https://linktr.ee/blackbeermza'

const PINK = '#F77FBF'
const CREAM = '#EFE7DB'
const YELLOW = '#F6D525'
const NAVY = '#1F2A5C'

// Todas las medidas usan cqw (1% del ancho de la tarjeta) para escalar igual en cualquier tamaño.
const cq = (n: number) => `${n}cqw`
const font = (v: string) => `var(--font-${v}), sans-serif`

function useQr() {
  const [svg, setSvg] = useState('')
  useEffect(() => { QRCode.toString(QR_URL, { type: 'svg', margin: 0, color: { dark: '#000000', light: '#0000' } }).then(setSvg).catch(() => {}) }, [])
  return svg
}

function Qr({ svg, style }: { svg: string; style?: CSSProperties }) {
  return <div style={style} className="[&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
}

function NfcWaves({ color, style }: { color: string; style?: CSSProperties }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', width: cq(6), height: cq(6), ...style }}>
    <circle cx="5" cy="12" r="1" fill={color} stroke="none" /><path d="M9 8.5a5 5 0 0 1 0 7" /><path d="M13 5.5a9 9 0 0 1 0 13" /><path d="M17 2.8a13 13 0 0 1 0 18.4" />
  </svg>
}

function Insta({ color, size }: { color: string; size: number }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" style={{ width: cq(size), height: cq(size), flexShrink: 0 }}>
    <rect x="3" y="3" width="18" height="18" rx="5.5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.3" cy="6.7" r="1" fill={color} stroke="none" />
  </svg>
}

const Face = ({ back, className = '', style, children }: { back?: boolean; className?: string; style?: CSSProperties; children: ReactNode }) =>
  <div className={`bb-face ${back ? 'bb-back' : ''} ${className}`} style={style}>{children}</div>

const backRow: CSSProperties = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: `0 ${cq(8)}`, gap: cq(4.5) }

function Stamp() {
  return <svg viewBox="0 0 200 200" style={{ position: 'absolute', left: '25%', top: '50%', width: '47.5%', transform: 'translateY(-50%)' }}>
    <defs>
      <path id="bb-top" d="M 38,100 A 62,62 0 0 1 162,100" />
      <path id="bb-bot" d="M 22,100 A 78,78 0 0 0 178,100" />
    </defs>
    <circle cx="100" cy="100" r="96" fill="none" stroke={CREAM} strokeWidth="3.5" />
    <circle cx="100" cy="100" r="90" fill="none" stroke={CREAM} strokeWidth="1" />
    <line x1="22" y1="78" x2="178" y2="78" stroke={CREAM} strokeWidth="1.5" /><line x1="22" y1="122" x2="178" y2="122" stroke={CREAM} strokeWidth="1.5" />
    <text fill={CREAM} fontFamily={font('oswald')} fontWeight="600" fontSize="15" letterSpacing="3"><textPath href="#bb-top" startOffset="50%" textAnchor="middle">BAR DE AMIGOS</textPath></text>
    <text x="100" y="112" textAnchor="middle" fill={CREAM} fontFamily={font('bebas')} fontSize="46" letterSpacing="1">BLACK BEER</text>
    <text fill={CREAM} fontFamily={font('oswald')} fontWeight="500" fontSize="14" letterSpacing="3"><textPath href="#bb-bot" startOffset="50%" textAnchor="middle">@BLACKBEERMZA</textPath></text>
  </svg>
}

const Logo = ({ style }: { style?: CSSProperties }) => <img src="/blackbeer-logo.png" alt="Blackbeer" style={{ position: 'absolute', ...style }} />

function Front({ design }: { design: CardDesign }) {
  if (design === 'A') return <Face className="bb-sand">
    <p style={{ position: 'absolute', top: '31%', width: '100%', textAlign: 'center', color: CREAM, fontFamily: font('bebas'), fontSize: cq(4.2), letterSpacing: '.42em' }}>BAR DE AMIGOS</p>
    <p style={{ position: 'absolute', top: '36%', width: '100%', textAlign: 'center', color: PINK, fontFamily: font('bangers'), fontSize: cq(19), lineHeight: 1, transform: 'rotate(-5deg) skewX(-6deg)', textShadow: '0 .6cqw 1.2cqw rgba(0,0,0,.5)' }}>BLACK BEER</p>
    <NfcWaves color={PINK} style={{ right: '8%', top: '12%' }} />
  </Face>
  if (design === 'B') return <Face style={{ background: '#121110', border: '1px solid #2c2b29' }}>
    <Stamp /><NfcWaves color={CREAM} style={{ right: '8%', bottom: '10%', width: cq(4.5), height: cq(4.5) }} />
  </Face>
  if (design === 'C') return <Face style={{ background: 'radial-gradient(circle at 8% 4%, rgba(112,104,170,.7), transparent 38%), radial-gradient(circle at 90% 98%, #e0896a 0, #b9c99a 22%, transparent 42%), #17171e' }}>
    <Logo style={{ left: '12%', top: '19%', width: '76%', transform: 'rotate(-3deg)' }} /><NfcWaves color={CREAM} style={{ right: '8%', top: '12%' }} />
  </Face>
  return <Face className="bb-sand">
    <Logo style={{ left: '12%', top: '15%', width: '74%', transform: 'rotate(-3deg)' }} />
    <p style={{ position: 'absolute', bottom: '12%', width: '100%', textAlign: 'center', color: CREAM, fontFamily: font('sedgwick'), fontSize: cq(4.6), letterSpacing: '.03em' }}>BAR DE AMIGOS</p>
    <NfcWaves color={CREAM} style={{ right: '8%', top: '12%' }} />
  </Face>
}

function Back({ design, qr }: { design: CardDesign; qr: string }) {
  const qrBox = { width: cq(33), height: cq(33), flexShrink: 0 } as const
  if (design === 'A') return <Face back className="bb-sand"><div style={backRow}>
    <Qr svg={qr} style={{ ...qrBox, background: '#fff', borderRadius: cq(3.2), padding: cq(3) }} />
    <div>
      <p style={{ color: PINK, fontFamily: font('bangers'), fontSize: cq(6.4), lineHeight: 1.05, transform: 'rotate(-2deg) skewX(-6deg)' }}>ESCANEÁ O ACERCÁ TU CELU</p>
      <p style={{ marginTop: cq(2), color: CREAM, opacity: .85, fontFamily: font('montserrat'), fontSize: cq(2.3), lineHeight: 1.35 }}>WhatsApp de los 3 locales y la carta digital</p>
      <p style={{ marginTop: cq(3), display: 'flex', alignItems: 'center', gap: cq(1.4), color: PINK, fontFamily: font('bebas'), fontSize: cq(4.2), letterSpacing: '.02em' }}><Insta color={PINK} size={3.6} />BLACKBEERMZA</p>
    </div>
  </div></Face>
  if (design === 'B') return <Face back style={{ background: CREAM }}><div style={backRow}>
    <Qr svg={qr} style={{ ...qrBox, width: cq(32), height: cq(32), border: `${cq(.5)} solid #151413`, borderRadius: cq(1.2), padding: cq(2.6), background: '#fff' }} />
    <div style={{ color: '#151413' }}>
      <p style={{ fontFamily: font('bebas'), fontSize: cq(8), lineHeight: .98 }}>ESCANEÁ O ACERCÁ TU CELULAR</p>
      <div style={{ width: cq(9), height: cq(.5), background: '#151413', margin: `${cq(2.6)} 0` }} />
      <p style={{ fontFamily: font('oswald'), fontSize: cq(2.7), letterSpacing: '.14em', lineHeight: 1.45 }}>WHATSAPP · 3 LOCALES<br />CARTA DIGITAL</p>
      <p style={{ marginTop: cq(2.6), color: '#8E6B3A', fontFamily: font('oswald'), fontWeight: 500, fontSize: cq(2.8), letterSpacing: '.2em' }}>@BLACKBEERMZA</p>
    </div>
  </div></Face>
  if (design === 'C') return <Face back style={{ background: '#F49DC4' }}><div style={backRow}>
    <Qr svg={qr} style={{ ...qrBox, background: '#fff', border: `${cq(1.1)} solid ${NAVY}`, borderRadius: cq(3.2), padding: cq(2.6), transform: 'rotate(-3deg)', boxShadow: `${cq(.9)} ${cq(.9)} 0 ${NAVY}` }} />
    <div style={{ color: NAVY, fontFamily: font('fredoka') }}>
      <p style={{ fontWeight: 700, fontSize: cq(6), lineHeight: 1.08 }}>¡Escaneá o acercá tu celu!</p>
      <p style={{ marginTop: cq(2), fontWeight: 500, fontSize: cq(2.5), lineHeight: 1.35 }}>WhatsApp de los 3 locales + carta digital</p>
      <p style={{ marginTop: cq(3), display: 'inline-flex', alignItems: 'center', gap: cq(1.2), background: YELLOW, border: `${cq(.7)} solid ${NAVY}`, borderRadius: cq(5), padding: `${cq(.8)} ${cq(2.4)} ${cq(.8)} ${cq(1.6)}`, fontWeight: 700, fontSize: cq(3.3) }}><Insta color={NAVY} size={3.4} />blackbeermza</p>
    </div>
  </div></Face>
  return <Face back style={{ background: '#121110', border: '1px solid #2c2b29' }}><div style={backRow}>
    <Qr svg={qr} style={{ ...qrBox, background: '#fff', borderRadius: cq(3.2), padding: cq(3) }} />
    <div>
      <p style={{ color: CREAM, fontFamily: font('sedgwick'), fontSize: cq(5.6), lineHeight: 1.1 }}>ESCANEÁ O ACERCÁ TU CELU</p>
      <p style={{ marginTop: cq(2), color: CREAM, opacity: .8, fontFamily: font('montserrat'), fontSize: cq(2.3), lineHeight: 1.35 }}>WhatsApp de los 3 locales y la carta digital</p>
      <p style={{ marginTop: cq(3), display: 'flex', alignItems: 'center', gap: cq(1.4), color: YELLOW, fontFamily: font('sedgwick'), fontSize: cq(3.8) }}><Insta color={YELLOW} size={3.6} />BLACKBEERMZA</p>
    </div>
  </div></Face>
}

export function NfcCard3D({ design, flipped, customer }: { design: CardDesign; flipped: boolean; customer?: CardCustomer }) {
  const qr = useQr()
  if (design === 'E') return <div className="flex h-[360px] w-full items-center justify-center">
    <ReflectiveCard name={customer?.name ?? 'Cliente Blackbeer'} role="Cliente · Bar de amigos" badge="Miembro" status="Activa" statusColor={YELLOW}
      idLabel="Puntos" idValue={customer ? customer.points.toLocaleString('es-AR') : '—'} tint="#f2b8cd" width={230} height={330} radius={22} />
  </div>
  if (design === 'F') return <div className="flex h-[360px] w-full flex-col items-center justify-center gap-2">
    <HoloCard image="/holo/front.png" backImage="/holo/back.png" alt="Tarjeta Blackbeer" preset="rainbow" width={230} radius={16} />
  </div>
  return <div className="bb-stage h-[290px] w-full">
    <div className="bb-tilt"><div className="bb-flip" data-flipped={flipped}><Front design={design} /><Back design={design} qr={qr} /></div></div>
  </div>
}
