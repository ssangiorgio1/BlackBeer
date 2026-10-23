import { NextResponse } from 'next/server'
import { deviceAuthorized, getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Vista pública de solo lectura: el token de la URL grabada en el chip identifica al cliente.
// No expone UID, email ni teléfono, y no permite ninguna acción.
// Si además se pasa ?deviceId= de un dispositivo autorizado, se incluye el customerId para operar la caja desde esta misma página.
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const db = await getDb()
  const card = db.cards.find((c) => c.token === token && c.active)
  if (!card) return NextResponse.json({ error: 'Tarjeta no encontrada' }, { status: 404 })
  const customer = db.customers.find((c) => c.id === card.customerId)!
  const staff = deviceAuthorized(db, new URL(req.url).searchParams.get('deviceId'))
  return NextResponse.json({
    name: customer.name,
    points: customer.points,
    barcode: card.barcode,
    ...(staff ? { customerId: customer.id } : {}),
    rewards: db.products.filter((p) => p.active).sort((a, b) => a.cost - b.cost).map(({ id, name, cost }) => ({ id, name, cost })),
    history: db.transactions.filter((t) => t.customerId === customer.id).slice(0, 15).map(({ id, type, points, detail, createdAt }) => ({ id, type, points, detail, createdAt })),
  })
}
