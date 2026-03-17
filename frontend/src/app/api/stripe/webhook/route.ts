import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: Request) {
  const body = await req.text()
  const headersList = await headers()
  const sig = headersList.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const data = event.data.object

  function planFromPriceId(priceId: string): string {
    if (priceId === process.env.STRIPE_PRICE_ID_BUSINESS) return 'business'
    if (priceId === process.env.STRIPE_PRICE_ID_PRO) return 'pro'
    return 'free'
  }

  if (event.type === 'checkout.session.completed') {
    const session = data as Stripe.Checkout.Session
    const userId = session.metadata?.user_id
    const subscriptionId = session.subscription as string

    if (userId && subscriptionId) {
      const sub = await stripe.subscriptions.retrieve(subscriptionId)
      const priceId = sub.items.data[0]?.price.id ?? ''
      await supabase.from('subscriptions').upsert(
        {
          user_id: userId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscriptionId,
          status: sub.status,
          plan: planFromPriceId(priceId),
          current_period_end: new Date(
            (sub as unknown as { current_period_end: number }).current_period_end * 1000,
          ).toISOString(),
        },
        { onConflict: 'user_id' },
      )
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const sub = data as Stripe.Subscription
    const priceId = sub.items.data[0]?.price.id ?? ''
    await supabase
      .from('subscriptions')
      .update({
        status: sub.status,
        plan: planFromPriceId(priceId),
        current_period_end: new Date(
          (sub as unknown as { current_period_end: number }).current_period_end * 1000,
        ).toISOString(),
      })
      .eq('stripe_subscription_id', sub.id)
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = data as Stripe.Subscription
    await supabase
      .from('subscriptions')
      .update({ status: 'canceled' })
      .eq('stripe_subscription_id', sub.id)
  }

  return NextResponse.json({ received: true })
}
