import { NextResponse } from 'next/server'
import { devicePrivileged, getDb, save, uid } from '@/lib/db'

export const dynamic = 'force-dynamic'

// ?all=1 incluye los premios desactivados (para el panel de administración)
export async function GET(req: Request) {
  const all = new URL(req.url).searchParams.get('all') === '1'
  const db = await getDb()
  return NextResponse.json(all ? db.products : db.products.filter((p) => p.active))
}

export async function POST(req: Request) {
  const { name, cost, deviceId } = await req.json()
  const db = await getDb()
  if (!devicePrivileged(db, deviceId)) return NextResponse.json({ error: 'Solo el administrador (PARENT) puede editar premios' }, { status: 403 })
  const c = Math.floor(Number(cost))
  if (!name?.trim() || !(c > 0)) return NextResponse.json({ error: 'Nombre y costo (mayor a 0) son obligatorios' }, { status: 400 })
  const product = { id: uid(), name: name.trim(), cost: c, active: true }
  db.products.push(product)
  await save(db)
  return NextResponse.json(product, { status: 201 })
}
