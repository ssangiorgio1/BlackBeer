import { NextResponse } from 'next/server'
import { getDb, save, uid } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Registro: si NO hay ADMIN_SETUP_CODE configurado, el primer dispositivo queda como PARENT (modo local).
// Si hay código, todos entran como PENDING y el administrador se reclama con ese código (ver /claim),
// así un bot o un visitante que llegue primero no se queda con el control.
export async function POST(req: Request) {
  const { deviceId, deviceName, platform } = await req.json()
  if (!deviceId) return NextResponse.json({ error: 'Falta deviceId' }, { status: 400 })
  const db = await getDb()
  let d = db.devices.find((x) => x.deviceId === deviceId)
  if (!d) {
    const first = db.devices.length === 0 && !process.env.ADMIN_SETUP_CODE
    d = { id: uid(), deviceId, deviceName: deviceName || 'Dispositivo', platform: platform || 'web', status: first ? 'PARENT' : 'PENDING', createdAt: new Date().toISOString() }
    db.devices.push(d)
    await save(db)
  }
  return NextResponse.json({ id: d.id, status: d.status })
}

// Los deviceId son la "llave" de cada dispositivo, así que no se publican: solo se ve completo el propio (?deviceId=).
export async function GET(req: Request) {
  const me = new URL(req.url).searchParams.get('deviceId')
  const db = await getDb()
  return NextResponse.json(db.devices.map((d) => (d.deviceId === me ? d : { ...d, deviceId: `••••${d.deviceId.slice(-4)}` })))
}
