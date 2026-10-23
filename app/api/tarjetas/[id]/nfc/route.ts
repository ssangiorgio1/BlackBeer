import { NextResponse } from 'next/server'
import { cardView, deviceAuthorized, getDb, normalizeUid, save } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const { nfcUid, deviceId, overwrite } = await req.json()
  const db = await getDb()
  if (!deviceAuthorized(db, deviceId)) return NextResponse.json({ error: 'Dispositivo no autorizado' }, { status: 403 })
  const uidN = normalizeUid(nfcUid ?? '')
  if (!uidN) return NextResponse.json({ error: 'UID inválido' }, { status: 400 })
  const card = db.cards.find((c) => c.id === id)
  if (!card) return NextResponse.json({ error: 'Tarjeta no encontrada' }, { status: 404 })
  const other = db.cards.find((c) => c.nfcUid === uidN && c.id !== id)
  if (other) return NextResponse.json({ error: `Ese chip ya está vinculado a ${other.barcode}` }, { status: 409 })
  if (card.nfcUid && !overwrite) return NextResponse.json({ error: 'La tarjeta ya tiene un chip asignado', needsOverwrite: true }, { status: 409 })
  card.nfcUid = uidN
  await save(db)
  return NextResponse.json({ success: true, card: cardView(db, card) })
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const deviceId = new URL(req.url).searchParams.get('deviceId')
  const db = await getDb()
  if (!deviceAuthorized(db, deviceId)) return NextResponse.json({ error: 'Dispositivo no autorizado' }, { status: 403 })
  const card = db.cards.find((c) => c.id === id)
  if (!card) return NextResponse.json({ error: 'Tarjeta no encontrada' }, { status: 404 })
  card.nfcUid = null
  await save(db)
  return NextResponse.json({ success: true, card: cardView(db, card) })
}
