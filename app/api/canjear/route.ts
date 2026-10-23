import { NextResponse } from 'next/server'
import { cardOf, deviceAuthorized, getDb, save, uid } from '@/lib/db'

export const dynamic = 'force-dynamic'

// El canje lo confirma siempre un dispositivo autorizado (el cajero), nunca el celular del cliente.
export async function POST(req: Request) {
  const { customerId, productId, deviceId } = await req.json()
  const db = await getDb()
  const device = deviceAuthorized(db, deviceId)
  if (!device) return NextResponse.json({ error: 'Dispositivo no autorizado' }, { status: 403 })
  const customer = db.customers.find((c) => c.id === customerId)
  const product = db.products.find((p) => p.id === productId && p.active)
  if (!customer || !product) return NextResponse.json({ error: 'Cliente o premio no encontrado' }, { status: 404 })
  if (customer.points < product.cost) return NextResponse.json({ error: `Puntos insuficientes: le faltan ${product.cost - customer.points}` }, { status: 409 })
  const before = customer.points
  customer.points -= product.cost
  const tx = { id: uid(), customerId, type: 'REDEEM' as const, points: product.cost, detail: `Canje: ${product.name}`, createdAt: new Date().toISOString(), before, after: customer.points, deviceName: device.deviceName, cardBarcode: cardOf(db, customerId)?.barcode ?? '—' }
  db.transactions.unshift(tx)
  await save(db)
  return NextResponse.json({ customer, product, transaction: tx })
}
