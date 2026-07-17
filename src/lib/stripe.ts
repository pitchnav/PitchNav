import Stripe from 'stripe'

// Singleton server-side Stripe client
// Only import from Server Components or Route Handlers
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
})

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID!
export const STRIPE_PRODUCT_ID = process.env.STRIPE_PRODUCT_ID!
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!

export async function createCheckoutSession({
  orderId,
  athleteName,
  userId,
  successUrl,
  cancelUrl,
}: {
  orderId: string
  athleteName: string
  userId: string
  successUrl: string
  cancelUrl: string
}) {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: STRIPE_PRICE_ID,
        quantity: 1,
      },
    ],
    metadata: {
      order_id: orderId,
      user_id: userId,
      athlete_name: athleteName,
    },
    customer_email: undefined, // set via metadata if needed
    success_url: successUrl,
    cancel_url: cancelUrl,
    // The configured Stripe Price must be a recurring monthly $40 price.
    subscription_data: {
      metadata: { order_id: orderId, user_id: userId },
    },
  })

  return session
}

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    STRIPE_WEBHOOK_SECRET
  )
}
