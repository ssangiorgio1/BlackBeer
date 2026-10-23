import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const db = await getDb()
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const redeems = db.transactions.filter((t) => t.type === 'REDEEM')
  const byProduct = new Map<string, number>()
  for (const t of redeems) { const name = t.detail.replace('Canje: ', ''); byProduct.set(name, (byProduct.get(name) ?? 0) + 1) }
  const top = [...byProduct.entries()].sort((a, b) => b[1] - a[1])[0]
  return NextResponse.json({
    pointsInCirculation: db.customers.reduce((s, c) => s + c.points, 0),
    customers: db.customers.length,
    redeemsThisMonth: redeems.filter((t) => new Date(t.createdAt) >= monthStart).length,
    linkedCards: db.cards.filter((c) => c.nfcUid).length,
    totalCards: db.cards.length,
    topReward: top ? { name: top[0], count: top[1] } : null,
    recent: db.transactions.slice(0, 6).map((t) => ({ ...t, customerName: db.customers.find((c) => c.id === t.customerId)?.name ?? '—' })),
  })
}
