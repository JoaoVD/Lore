import { NextRequest, NextResponse } from 'next/server'

// TODO: implement Stripe webhook handler
export async function POST(_req: NextRequest) {
  return NextResponse.json({ received: true })
}
