import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const deviceId = new URL(req.url).searchParams.get('deviceId')
  const d = (await getDb()).devices.find((x) => x.deviceId === deviceId)
  if (!d) return NextResponse.json({ authorized: false, status: 'UNREGISTERED', role: null }, { status: 404 })
  const authorized = d.status === 'CHILD' || d.status === 'PARENT'
  return NextResponse.json({ authorized, status: d.status, role: authorized ? d.status : null })
}
