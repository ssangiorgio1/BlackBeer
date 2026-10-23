import { NextResponse } from 'next/server'
import { cardOf, deviceAuthorized, getDb, save, uid } from '@/lib/db'

export const dynamic = 'force-dynamic'

// $1 = 1 punto. Solo dispositivos autorizados pueden sumar puntos.
export async function POST(req: Request) {
  const { customerId, amount, deviceId } = await req.json()
  const db = await getDb()
  const device = deviceAuthorized(db, deviceId)
  if (!device) return NextResponse.json({ error: 'Dispositivo no autorizado' }, { status: 403 })
  const n = Math.floor(Number(amount))
  if (!(n > 0) || n > 1_000_000) return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
  const customer = db.customers.find((c) => c.id === customerId)
  if (!customer) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
  const before = customer.points
  customer.points += n
  const tx = { id: uid(), customerId, type: 'EARN' as const, points: n, detail: `Compra por $${n}`, createdAt: new Date().toISOString(), before, after: customer.points, deviceName: device.deviceName, cardBarcode: cardOf(db, customerId)?.barcode ?? '—' }
  db.transactions.unshift(tx)
  await save(db)
  return NextResponse.json({ customer, transaction: tx })
}
