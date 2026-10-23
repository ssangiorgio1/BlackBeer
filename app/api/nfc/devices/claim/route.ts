import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getDb, save } from '@/lib/db'

export const dynamic = 'force-dynamic'

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

// Reclamar el rol de administrador con el código secreto (variable de entorno ADMIN_SETUP_CODE).
// También sirve para recuperar el control si otro dispositivo se quedó con el rol PARENT.
export async function POST(req: Request) {
  const expected = process.env.ADMIN_SETUP_CODE
  if (!expected) return NextResponse.json({ error: 'No hay ADMIN_SETUP_CODE configurado en el servidor' }, { status: 400 })
  const { deviceId, code } = await req.json()
  await new Promise((r) => setTimeout(r, 400)) // frena la fuerza bruta
  if (typeof code !== 'string' || !same(code.trim(), expected)) return NextResponse.json({ error: 'Código incorrecto' }, { status: 403 })
  const db = await getDb()
  const d = db.devices.find((x) => x.deviceId === deviceId)
  if (!d) return NextResponse.json({ error: 'Dispositivo no registrado' }, { status: 404 })
  d.status = 'PARENT'
  await save(db)
  return NextResponse.json({ ok: true, status: d.status })
}
