import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

// ?customerId= filtra por cliente, ?limit= (por defecto 100)
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams
  const customerId = sp.get('customerId')
  const limit = Math.min(500, Number(sp.get('limit')) || 100)
  const db = await getDb()
  const rows = db.transactions
    .filter((t) => !customerId || t.customerId === customerId)
    .slice(0, limit)
    .map((t) => ({ ...t, customerName: db.customers.find((c) => c.id === t.customerId)?.name ?? '—' }))
  return NextResponse.json(rows)
}
