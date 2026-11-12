import type { Metadata } from 'next'
import Catalog from './Catalog'

export const metadata: Metadata = {
  title: 'Equipment Shop',
  description: 'Explore proposed Pitch Nav throwing gear, capture equipment and apparel. The collection is in preview.',
}

export default function ShopPage() {
  return <Catalog />
}
