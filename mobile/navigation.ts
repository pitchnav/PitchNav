// Block hosted purchases in the store wrapper while the digital billing route is under review.
// The billing portal stays accessible so existing web customers can manage or cancel.
export function isHostedPurchase(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return host === 'buy.stripe.com' || host === 'checkout.stripe.com'
  } catch {
    return false
  }
}
