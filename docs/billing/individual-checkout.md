# Individual checkout activation

Individual purchase buttons now use `/checkout/individual?plan=…&billing=…`.
This server route displays the initial total, renewal, assessment fees and billing help.
A separate Continue to payment button opens the matching Stripe Payment Link only when enabled. Teams keep the existing quote form. No customer payment is taken by a GET
request. The route does not create Stripe products or change existing memberships.

## Approved USD prices

| Option | First checkout | Renewal | Assessment included in first checkout |
|---|---:|---:|---:|
| Standalone assessment | $20.00 | None | — |
| Throwing monthly | $20.00 | $25.00/month | None |
| Throwing annual | $225.00 | $225.00/year | None |
| Complete monthly | $40.00 | $45.00/month | Included |
| Complete annual | $405.00 | $405.00/year | Included |
| Tracking monthly | $19.99 | $24.99/month | None |
| Tracking annual | $224.91 | $224.91/year | None |

Every monthly subscription has a $5 discount on the first invoice only. Each annual subscription costs 75% of twelve regular monthly payments and renews yearly at that price. Individual Complete includes one assessment at no extra charge. The standalone assessment is a one-time purchase. Prices are before tax; keep checkout disclosures consistent.

## Required before enabling sales

1. Create the seven matching products/prices and hosted links in Stripe test mode.
   Verify first invoice, renewal invoice, assessment line item, annual interval,
   discount expiry, cancellation, and refund behavior. Never reuse legacy $25/$40
   checkout links. Disable customer-adjustable quantity for individual purchases.
2. Complete and test account ownership and signed-webhook fulfillment for the new
   hosted links. The current legacy webhook requires `order_id` and `user_id` and
   cannot fulfill anonymous Payment Link purchases. These links do not add
   that integration. Do not enable live links until purchases attach to the correct
   account, create the assessment work item when needed, update subscription
   entitlements, and keep paid reports accessible after cancellation. Do not grant
   access based on a success URL or email alone.
3. Supply the seven server-only `STRIPE_CHECKOUT_*_URL` variables from `.env.example`. The V3 coaching and annual tracking links must use the updated prices. The existing V2 assessment and monthly tracking links retain their prices.
   Use only real `https://buy.stripe.com/...` destinations. Test each pricing card
   and the development/tracking page buttons against the correct checkout.
4. After price AND fulfillment verification, set `INDIVIDUAL_CHECKOUT_READY=true`.
   Keep `PITCH_TRACKING_SALES_READY=false` until tracking can actually be delivered;
   Complete continues to disclose tracking as included when released.
5. Verify in staging, then deploy. Missing/invalid configuration shows an honest
   checkout-unavailable page, never an old-priced checkout or a contact form.

No Stripe configuration, production deployment, new fulfillment integration, or
payment was performed as part of the button-routing change.
