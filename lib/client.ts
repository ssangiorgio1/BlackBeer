'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type CardView = {
  token: string
  id: string; barcode: string; nfcUid: string | null; active: boolean; lastUsedAt: string | null
  customer: { id: string; name: string; points: number; email?: string; phone?: string }
}
export type Product = { id: string; name: string; cost: number }
export type Device = { id: string; deviceId: string; deviceName: string; platform: string; status: string; createdAt: string }

export async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers }, cache: 'no-store' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || 'Error'), { data, status: res.status })
  return data
}

export function getDeviceId() {
  try {
    let id = localStorage.getItem('bb-device-id')
    if (!id) { id = 'BB-' + crypto.randomUUID().slice(0, 13).toUpperCase(); localStorage.setItem('bb-device-id', id) }
    return id
  } catch { return 'BB-SIN-STORAGE' }
}

function deviceLabel() {
  const ua = navigator.userAgent
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Mac/i.test(ua) ? 'Mac' : 'Web'
  const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : 'Navegador'
  return { name: `${os} · ${br}`, platform: os.toLowerCase() }
}

/** Registra este navegador como dispositivo y devuelve su estado (PENDING/CHILD/PARENT/REVOKED). */
export function useDevice() {
  const [deviceId, setDeviceId] = useState('')
  const [status, setStatus] = useState<string>('')
  const refresh = useCallback(async () => {
    const id = getDeviceId()
    setDeviceId(id)
    const l = deviceLabel()
    await api('/api/nfc/devices', { method: 'POST', body: JSON.stringify({ deviceId: id, deviceName: l.name, platform: l.platform }) }).catch(() => {})
    const me = await api(`/api/nfc/devices/me?deviceId=${id}`).catch(() => ({ status: 'ERROR' }))
    setStatus(me.status)
  }, [])
  useEffect(() => { refresh() }, [refresh])
  return { deviceId, status, authorized: status === 'CHILD' || status === 'PARENT', refresh }
}

/** Lectura de UID por Web NFC (Chrome en Android, requiere HTTPS o localhost). */
export function useNfcReader(onUid: (uid: string) => void) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const ctrl = useRef<AbortController | null>(null)
  const cb = useRef(onUid)
  cb.current = onUid
  const supported = typeof window !== 'undefined' && 'NDEFReader' in window

  const stop = useCallback(() => { ctrl.current?.abort(); ctrl.current = null; setScanning(false) }, [])
  const start = useCallback(async () => {
    setError('')
    if (!supported) { setError('Este navegador no soporta lectura NFC web (usá Chrome en Android con HTTPS). Podés ingresar el UID a mano.'); return }
    try {
      const reader = new (window as any).NDEFReader()
      ctrl.current = new AbortController()
      await reader.scan({ signal: ctrl.current.signal })
      setScanning(true)
      reader.onreadingerror = () => setError('No se pudo leer el chip, probá de nuevo.')
      reader.onreading = (e: any) => { if (e.serialNumber) { cb.current(e.serialNumber.toUpperCase()); stop() } }
    } catch (e: any) {
      setScanning(false)
      setError(e?.name === 'NotAllowedError' ? 'Permiso NFC denegado.' : `No se pudo activar el NFC: ${e?.message ?? e}`)
    }
  }, [supported, stop])
  useEffect(() => stop, [stop])
  return { supported, scanning, error, start, stop }
}

export type Movement = {
  id: string; customerId: string; customerName?: string; type: 'EARN' | 'REDEEM'; points: number; detail: string
  createdAt: string; before: number; after: number; deviceName: string; cardBarcode: string
}
export type Reward = { id: string; name: string; cost: number; active?: boolean }

export const fmt = (n: number) => n.toLocaleString('es-AR')
export const fmtDate = (iso: string) => new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

/** Graba una URL en el chip (Web NFC, solo Chrome en Android). Así cualquier celular que lo acerque abre la página del cliente. */
export function useNfcWriter() {
  const [writing, setWriting] = useState(false)
  const [error, setError] = useState('')
  const ctrl = useRef<AbortController | null>(null)
  const supported = typeof window !== 'undefined' && 'NDEFReader' in window

  const cancel = useCallback(() => { ctrl.current?.abort(); ctrl.current = null; setWriting(false) }, [])
  const write = useCallback(async (url: string) => {
    setError('')
    if (!supported) { setError('La grabación NFC solo funciona en Chrome para Android, con HTTPS.'); return false }
    try {
      ctrl.current = new AbortController()
      setWriting(true)
      await new (window as any).NDEFReader().write({ records: [{ recordType: 'url', data: url }] }, { signal: ctrl.current.signal, overwrite: true })
      setWriting(false)
      return true
    } catch (e: any) {
      setWriting(false)
      if (e?.name !== 'AbortError') setError(e?.name === 'NotAllowedError' ? 'Permiso NFC denegado.' : `No se pudo grabar el chip: ${e?.message ?? e}`)
      return false
    }
  }, [supported])
  useEffect(() => cancel, [cancel])
  return { supported, writing, error, write, cancel }
}
