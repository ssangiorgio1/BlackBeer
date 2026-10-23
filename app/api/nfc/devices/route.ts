import { NextResponse } from 'next/server'
import { getDb, save, uid } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Registro: el primer dispositivo queda como PARENT, el resto PENDING
export async function POST(req: Request) {
  const { deviceId, deviceName, platform } = await req.json()
  if (!deviceId) return NextResponse.json({ error: 'Falta deviceId' }, { status: 400 })
  const db = await getDb()
  let d = db.devices.find((x) => x.deviceId === deviceId)
  if (!d) {
    d = { id: uid(), deviceId, deviceName: deviceName || 'Dispositivo', platform: platform || 'web', status: db.devices.length === 0 ? 'PARENT' : 'PENDING', createdAt: new Date().toISOString() }
    db.devices.push(d)
    await save(db)
  }
  return NextResponse.json({ id: d.id, status: d.status })
}

export async function GET() {
  return NextResponse.json((await getDb()).devices)
}
