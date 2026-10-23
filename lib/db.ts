import fs from 'node:fs'
import path from 'node:path'

export type Customer = { id: string; name: string; email?: string; phone?: string; points: number }
// token: código secreto de la URL pública del cliente (/c/<token>), se graba en el chip
export type Card = { id: string; barcode: string; token: string; nfcUid: string | null; customerId: string; active: boolean; createdAt: string; lastUsedAt: string | null }
export type DeviceStatus = 'PENDING' | 'CHILD' | 'PARENT' | 'REVOKED'
export type NfcDevice = { id: string; deviceId: string; deviceName: string; platform: string; status: DeviceStatus; createdAt: string }
export type Transaction = {
  id: string; customerId: string; type: 'EARN' | 'REDEEM'; points: number; detail: string; createdAt: string
  before: number; after: number; deviceName: string; cardBarcode: string
}
export type Product = { id: string; name: string; cost: number; active: boolean }
export type Db = { customers: Customer[]; cards: Card[]; devices: NfcDevice[]; transactions: Transaction[]; products: Product[] }

// Persistencia: Redis REST (Upstash / Vercel KV) si hay variables de entorno; si no, archivo local o memoria.
const REST_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
const REST_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
const KEY = 'blackbeer-demo-db'
const FILE = path.join(process.cwd(), 'data', 'db.json')
const g = globalThis as unknown as { __demoDb?: Db }

async function redis(cmd: unknown[]) {
  const res = await fetch(REST_URL!, { method: 'POST', headers: { Authorization: `Bearer ${REST_TOKEN}` }, body: JSON.stringify(cmd), cache: 'no-store' })
  if (!res.ok) throw new Error(`Redis ${res.status}`)
  return (await res.json()).result as string | null
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
export const newToken = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12)
export const normalizeUid = (v: string) => v.replace(/[^0-9a-fA-F]/g, '').toUpperCase().match(/.{1,2}/g)?.join(':') ?? ''

function seed(): Db {
  const now = Date.now()
  const ago = (min: number) => new Date(now - min * 60000).toISOString()
  const iso = new Date(now).toISOString()
  const tx = (n: number, customerId: string, type: 'EARN' | 'REDEEM', points: number, detail: string, before: number, min: number, barcode: string) => ({
    id: `t${n}`, customerId, type, points, detail, createdAt: ago(min), before, after: type === 'EARN' ? before + points : before - points, deviceName: 'Caja principal', cardBarcode: barcode,
  })
  return {
    customers: [
      { id: 'c1', name: 'Valentina Ríos', email: 'valentina@correo.com', points: 1240 },
      { id: 'c2', name: 'Mateo Silva', email: 'mateo@correo.com', points: 890 },
      { id: 'c3', name: 'Lucía Torres', email: 'lucia@correo.com', points: 2450 },
    ],
    cards: [
      { id: 'k1', barcode: 'NFC-0024', token: newToken(), nfcUid: '04:A1:B2:C3:D4:E5:F6', customerId: 'c1', active: true, createdAt: iso, lastUsedAt: ago(95) },
      { id: 'k2', barcode: 'NFC-0023', token: newToken(), nfcUid: '04:11:22:33:44:55:66', customerId: 'c2', active: true, createdAt: iso, lastUsedAt: ago(2900) },
      { id: 'k3', barcode: 'NFC-0021', token: newToken(), nfcUid: null, customerId: 'c3', active: true, createdAt: iso, lastUsedAt: null },
    ],
    devices: [],
    transactions: [
      tx(3, 'c1', 'EARN', 340, 'Compra por $340', 900, 95, 'NFC-0024'),
      tx(2, 'c2', 'REDEEM', 250, 'Canje: Trago de la casa', 1140, 2900, 'NFC-0023'),
      tx(1, 'c2', 'EARN', 180, 'Compra por $180', 960, 4300, 'NFC-0023'),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    products: [
      { id: 'p1', name: 'Smash Clásica', cost: 400, active: true },
      { id: 'p2', name: 'Trago de la casa', cost: 250, active: true },
      { id: 'p3', name: 'Papas con cheddar', cost: 180, active: true },
      { id: 'p4', name: 'Cerveza artesanal', cost: 220, active: true },
    ],
  }
}

// Completa campos que no existían en datos guardados por versiones anteriores de la demo.
function normalize(db: Db) {
  let changed = false
  for (const c of db.cards) if (!c.token) { c.token = newToken(); changed = true }
  for (const t of db.transactions) {
    if (t.before === undefined) { t.before = 0; t.after = 0; t.deviceName = t.deviceName ?? '—'; t.cardBarcode = t.cardBarcode ?? '—'; changed = true }
  }
  return changed
}

export async function getDb(): Promise<Db> {
  if (REST_URL && REST_TOKEN) {
    const raw = await redis(['GET', KEY])
    if (raw) { const db: Db = JSON.parse(raw); if (normalize(db)) await save(db); return db }
    const fresh = seed()
    await save(fresh)
    return fresh
  }
  if (g.__demoDb) { if (normalize(g.__demoDb)) await save(g.__demoDb); return g.__demoDb }
  try { g.__demoDb = JSON.parse(fs.readFileSync(FILE, 'utf8')) } catch { g.__demoDb = seed() }
  if (normalize(g.__demoDb!)) await save(g.__demoDb!)
  return g.__demoDb!
}

export async function save(db: Db) {
  if (REST_URL && REST_TOKEN) { await redis(['SET', KEY, JSON.stringify(db)]); return }
  g.__demoDb = db
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true })
    fs.writeFileSync(FILE, JSON.stringify(db, null, 2))
  } catch { /* sin disco: queda en memoria */ }
}

export const persistence = () => (REST_URL && REST_TOKEN ? 'redis' : 'local')

export async function resetDb() { await save(seed()) }

export function cardView(db: Db, card: Card) {
  return { ...card, customer: db.customers.find((c) => c.id === card.customerId)! }
}

export function deviceAuthorized(db: Db, deviceId: string | null | undefined) {
  const d = db.devices.find((x) => x.deviceId === deviceId)
  return d && (d.status === 'CHILD' || d.status === 'PARENT') ? d : null
}

export function devicePrivileged(db: Db, deviceId: string | null | undefined) {
  const d = db.devices.find((x) => x.deviceId === deviceId)
  return d?.status === 'PARENT' ? d : null
}

export function newBarcode(db: Db) {
  const max = db.cards.reduce((m, c) => Math.max(m, parseInt(c.barcode.replace(/\D/g, '')) || 0), 0)
  return `NFC-${String(max + 1).padStart(4, '0')}`
}

export function cardOf(db: Db, customerId: string) {
  return db.cards.find((c) => c.customerId === customerId)
}
