import { NextResponse } from 'next/server'
import { devicePrivileged, getDb, save } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const { name, cost, active, deviceId } = await req.json()
  const db = await getDb()
  if (!devicePrivileged(db, deviceId)) return NextResponse.json({ error: 'Solo el administrador (PARENT) puede editar premios' }, { status: 403 })
  const p = db.products.find((x) => x.id === id)
  if (!p) return NextResponse.json({ error: 'Premio no encontrado' }, { status: 404 })
  if (name !== undefined) { if (!String(name).trim()) return NextResponse.json({ error: 'Nombre vacío' }, { status: 400 }); p.name = String(name).trim() }
  if (cost !== undefined) { const c = Math.floor(Number(cost)); if (!(c > 0)) return NextResponse.json({ error: 'Costo inválido' }, { status: 400 }); p.cost = c }
  if (active !== undefined) p.active = !!active
  await save(db)
  return NextResponse.json(p)
}
