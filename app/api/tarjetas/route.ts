import { NextResponse } from 'next/server'
import { cardView, getDb, newBarcode, newToken, save, uid } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const db = await getDb()
  return NextResponse.json(db.cards.map((c) => cardView(db, c)))
}

// Crea cliente + tarjeta nueva (barcode automático)
export async function POST(req: Request) {
  const { name, phone, email } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Falta el nombre' }, { status: 400 })
  const db = await getDb()
  const customer = { id: uid(), name: name.trim(), phone, email, points: 0 }
  const card = { id: uid(), barcode: newBarcode(db), token: newToken(), nfcUid: null, customerId: customer.id, active: true, createdAt: new Date().toISOString(), lastUsedAt: null }
  db.customers.push(customer)
  db.cards.push(card)
  await save(db)
  return NextResponse.json(cardView(db, card), { status: 201 })
}
