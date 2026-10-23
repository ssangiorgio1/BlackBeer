import { NextResponse } from 'next/server'
import { devicePrivileged, getDb, persistence, resetDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Solo un dispositivo administrador (PARENT) puede reiniciar la demo. Si todavía no hay ningún PARENT, se permite.
export async function POST(req: Request) {
  const { deviceId } = await req.json().catch(() => ({}))
  const db = await getDb()
  const hasParent = db.devices.some((d) => d.status === 'PARENT')
  if (hasParent && !devicePrivileged(db, deviceId)) return NextResponse.json({ error: 'Solo el administrador (PARENT) puede reiniciar la demo' }, { status: 403 })
  await resetDb()
  return NextResponse.json({ ok: true })
}

// Diagnóstico: indica si la demo está usando Redis o almacenamiento local/memoria
export async function GET() {
  return NextResponse.json({ persistence: persistence() })
}
