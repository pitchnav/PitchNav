# Individual checkout activation

Individual purchase buttons now use `/checkout/individual?plan=…&billing=…`.
This server route redirects directly to the matching configured Stripe Payment
Link. Teams keep the existing quote form. No customer payment is taken by a GET
request. The route does not create Stripe products or change existing memberships.

## Approved USD prices

| Option | First checkout | Renewal | Assessment included in first checkout |
|---|---:|---:|---:|
| Standalone assessment | $59.99 | None | — |
| Throwing monthly | $69.98 | $24.99/month | $49.99 |
| Throwing annual | $289.98 | $239.99/year | $49.99 |
| Complete monthly | $84.98 | $39.99/month | $49.99 |
| Complete annual | $429.98 | $379.99/year | $49.99 |
| Tracking monthly | $19.99 | $24.99/month | None |
| Tracking annual | $239.99 | $239.99/year | None |

Monthly subscriptions need a $5 discount on the first invoice only. Annual
subscriptions do not also receive that discount. Assessment fees are one-time,
never recurring. Prices are before tax; keep checkout disclosures consistent.

## Required before enabling sales

1. Create the seven matching products/prices and hosted links in Stripe test mode.
   Verify first invoice, renewal invoice, assessment line item, annual interval,
   discount expiry, cancellation, and refund behavior. Never reuse legacy $25/$40
   checkout links. Disable customer-adjustable quantity for individual purchases.
2. Complete and test account ownership and signed-webhook fulfillment for the new
   hosted links. The current legacy webhook requires `order_id` and `user_id` and
   cannot fulfill anonymous Payment Link purchases. These redirects do NOT add
   that integration. Do not enable live links until purchases attach to the correct
   account, create the assessment work item when needed, update subscription
   entitlements, and keep paid reports accessible after cancellation. Do not grant
   access based on a success URL or email alone.
3. Supply the seven server-only `STRIPE_CHECKOUT_*_URL` variables from `.env.example`.
   Use only real `https://buy.stripe.com/...` destinations. Test each pricing card
   and the development/tracking page buttons against the correct checkout.
4. After price AND fulfillment verification, set `INDIVIDUAL_CHECKOUT_READY=true`.
   Keep `PITCH_TRACKING_SALES_READY=false` until tracking can actually be delivered;
   Complete continues to disclose tracking as included when released.
5. Verify in staging, then deploy. Missing/invalid configuration shows an honest
   checkout-unavailable page, never an old-priced checkout or a contact form.

No Stripe configuration, production deployment, new fulfillment integration, or
payment was performed as part of the button-routing change.
