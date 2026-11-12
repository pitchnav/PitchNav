import Catalog from './Catalog'
import styles from './Catalog.module.css'

export const metadata = { title: 'Shop', description: 'Preview proposed Pitch Nav throwing gear, camera equipment and apparel. Orders are closed.' }

export default function ShopPage() {
  return <div className="bg-navy-950 pt-16">
    <header className={styles.hero}>
      <div className="relative mx-auto max-w-7xl px-5 py-10 text-white sm:px-12 sm:py-12">
        <p className="text-sm font-semibold text-brand-blue">Pitch Nav <span className="text-brand-blue">/ Equipment</span></p>
        <h1 className="page-title mt-3">Built for the work.</h1>
        <p className="mt-3 max-w-md text-sm text-slate-200 sm:text-base">Preview our proposed throwing gear, camera setups and apparel. Gear is not available to order.</p>
        <a href="#collection" className="btn-action mt-6">Browse the preview</a>
      </div>
    </header>
    <section id="collection" aria-labelledby="collection-title" className="scroll-mt-16 bg-brand-paper text-brand-ink">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-10"><Catalog /></div>
    </section>
  </div>
}
