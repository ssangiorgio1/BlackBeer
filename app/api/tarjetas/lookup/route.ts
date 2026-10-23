import { NextResponse } from 'next/server'
import { cardView, getDb, normalizeUid, save } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams
  const barcode = sp.get('barcode')?.trim().toUpperCase()
  const nfcUid = sp.get('nfcUid') ? normalizeUid(sp.get('nfcUid')!) : null
  const touch = sp.get('touch') === '1'
  const db = await getDb()
  const card = db.cards.find((c) => (barcode && (c.barcode === barcode || c.nfcUid === barcode)) || (nfcUid && c.nfcUid === nfcUid))
  if (!card) return NextResponse.json({ error: 'Tarjeta no encontrada' }, { status: 404 })
  if (touch) { card.lastUsedAt = new Date().toISOString(); await save(db) }
  return NextResponse.json(cardView(db, card))
}
