import { NextResponse } from 'next/server'
import { getDb, save } from '@/lib/db'

export const dynamic = 'force-dynamic'

const VALID = ['CHILD', 'PARENT', 'REVOKED', 'PENDING']

// Demo: solo un dispositivo PARENT puede cambiar estados (se pasa su deviceId en el body)
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const { status, actorDeviceId } = await req.json()
  const db = await getDb()
  const actor = db.devices.find((d) => d.deviceId === actorDeviceId)
  if (actor?.status !== 'PARENT') return NextResponse.json({ error: 'Solo un dispositivo PARENT puede hacer esto' }, { status: 403 })
  if (!VALID.includes(status)) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  const d = db.devices.find((x) => x.id === id)
  if (!d) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  d.status = status
  await save(db)
  return NextResponse.json(d)
}
