'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Radio, X } from 'lucide-react'
import { useDevice } from '@/lib/client'

type Check = { ok: boolean | null; label: string; fix?: string }

const STATUS_FIX: Record<string, string> = {
  PENDING: 'Este dispositivo está pendiente: un administrador lo tiene que autorizar en “Roles y permisos” (desde la PC).',
  REVOKED: 'Este dispositivo fue revocado: un administrador tiene que reactivarlo en “Roles y permisos”.',
  UNREGISTERED: 'El dispositivo no se pudo registrar. Recargá la página.',
  ERROR: 'No se pudo consultar el estado del dispositivo. Revisá la conexión y recargá.',
}

export function NfcDiagnostics() {
  const device = useDevice()
  const [env, setEnv] = useState<{ secure: boolean; api: boolean; android: boolean; chrome: boolean; browser: string; perm: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState('')
  const ctrl = useRef<AbortController | null>(null)

  useEffect(() => {
    const ua = navigator.userAgent
    const android = /Android/i.test(ua)
    const browser = /SamsungBrowser/i.test(ua) ? 'Samsung Internet' : /Firefox/i.test(ua) ? 'Firefox' : /OPR\/|Opera/i.test(ua) ? 'Opera' : /EdgA|Edg\//i.test(ua) ? 'Edge' : /; wv\)|FBAN|FBAV|Instagram|WhatsApp/i.test(ua) ? 'navegador interno de una app' : /Chrome\//i.test(ua) ? 'Chrome' : 'otro'
    const base = { secure: window.isSecureContext, api: 'NDEFReader' in window, android, chrome: browser === 'Chrome', browser, perm: 'desconocido' }
    setEnv(base)
    ;(navigator as any).permissions?.query({ name: 'nfc' }).then((p: any) => setEnv((e) => e && { ...e, perm: p.state })).catch(() => {})
    return () => ctrl.current?.abort()
  }, [])

  const test = async () => {
    setResult('')
    if (testing) { ctrl.current?.abort(); setTesting(false); return }
    try {
      const reader = new (window as any).NDEFReader()
      ctrl.current = new AbortController()
      await reader.scan({ signal: ctrl.current.signal })
      setTesting(true); setResult('Esperando chip… apoyalo en la parte trasera del celular (cerca de la cámara).')
      reader.onreadingerror = () => setResult('Se detectó algo pero no se pudo leer. Probá de nuevo, más despacio, y fijate que el chip sea NFC.')
      reader.onreading = (e: any) => {
        const recs = (e.message?.records ?? []).map((r: any) => { try { return `${r.recordType}: ${new TextDecoder().decode(r.data)}` } catch { return r.recordType } })
        setResult(`✓ Chip leído. UID: ${e.serialNumber || '(no informado)'}${recs.length ? ` · contenido: ${recs.join(' | ')}` : ' · sin contenido grabado'}`)
        setTesting(false); ctrl.current?.abort()
      }
    } catch (e: any) {
      setTesting(false)
      setResult(e?.name === 'NotAllowedError' ? '✗ Permiso NFC denegado. Tocá el candado de la barra de direcciones → Permisos → NFC → Permitir.' : e?.name === 'NotSupportedError' ? '✗ El NFC está apagado o este celular no tiene. Activalo en Ajustes → Conexiones → NFC.' : `✗ ${e?.name}: ${e?.message}`)
    }
  }

  if (!env) return null
  const checks: Check[] = [
    { ok: env.secure, label: 'Conexión segura (HTTPS)', fix: 'Abrí la app desde la URL https de Vercel. Con http, una IP local o localhost el celular bloquea el NFC.' },
    { ok: env.android, label: 'Celular Android', fix: 'Leer el chip desde la web solo funciona en Android. El iPhone no lo permite.' },
    { ok: env.chrome, label: `Navegador Chrome (detectado: ${env.browser})`, fix: 'Abrí la URL en Chrome. Samsung Internet, Firefox y los navegadores internos de apps no soportan Web NFC.' },
    { ok: env.api, label: 'Soporte de Web NFC en este navegador', fix: 'Actualizá Chrome, y si usás un navegador interno de WhatsApp/Instagram, abrí el link en Chrome.' },
    { ok: env.perm === 'denied' ? false : env.perm === 'desconocido' ? null : true, label: `Permiso NFC (${env.perm})`, fix: 'Permitilo desde el candado de la barra de direcciones → Permisos → NFC.' },
    { ok: device.authorized ? true : device.status ? false : null, label: `Dispositivo autorizado (estado: ${device.status || '…'})`, fix: STATUS_FIX[device.status] ?? 'Este dispositivo no está autorizado.' },
  ]
  const failing = checks.filter((c) => c.ok === false)

  return <details open={failing.length > 0} className="mb-6 rounded-2xl bg-white p-4 text-sm">
    <summary className="flex cursor-pointer items-center gap-2 text-xs font-black uppercase tracking-widest">
      <span className={`size-2.5 rounded-full ${failing.length ? 'bg-[#D9628A]' : 'bg-green-500'}`} />
      Diagnóstico NFC {failing.length ? `· ${failing.length} problema${failing.length > 1 ? 's' : ''}` : '· todo bien'}
    </summary>
    <ul className="mt-3 flex flex-col gap-2">{checks.map((c) => <li key={c.label} className="flex gap-2">
      <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-white ${c.ok === true ? 'bg-green-500' : c.ok === false ? 'bg-[#D9628A]' : 'bg-black/20'}`}>{c.ok === false ? <X size={12} strokeWidth={3} /> : <Check size={12} strokeWidth={3} />}</span>
      <span><span className="text-xs font-bold">{c.label}</span>{c.ok === false && <span className="block text-[11px] font-semibold text-[#D9628A]">{c.fix}</span>}</span>
    </li>)}</ul>
    <div className="mt-4 border-t border-black/10 pt-3">
      <button onClick={test} disabled={!env.api} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black disabled:opacity-40 ${testing ? 'bg-[#D9628A] text-white' : 'bg-[#F6D525]'}`}><Radio size={14} className={testing ? 'animate-pulse' : ''} />{testing ? 'Cancelar prueba' : 'Probar lectura de un chip'}</button>
      {result && <p className="mt-2 break-words text-[11px] font-semibold">{result}</p>}
      <p className="mt-2 text-[10px] font-semibold text-black/40">La prueba no guarda nada: solo muestra lo que lee el celular.</p>
    </div>
  </details>
}
