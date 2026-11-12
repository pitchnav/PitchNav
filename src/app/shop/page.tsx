import Catalog from './Catalog'
import styles from './Catalog.module.css'

export const metadata = { title: 'Shop', description: 'Preview proposed Pitch Nav throwing gear, camera equipment and apparel. Orders are closed.' }

export default function ShopPage() {
  return <div className="bg-navy-950 pt-16">
    <header className={styles.hero}>
      <div className="relative mx-auto max-w-screen-2xl px-5 py-10 text-white sm:px-12 sm:py-12">
        <p className="text-xs font-bold uppercase tracking-[.22em]">Pitch Nav <span className="text-blue-400">/ Equipment</span></p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">Built for the work<span className="text-blue-500">.</span></h1>
        <p className="mt-3 max-w-md text-sm text-slate-200 sm:text-base">Preview our proposed throwing gear, camera setups and apparel. Gear is not available to order.</p>
        <a href="#collection" className="mt-6 inline-block border-b border-blue-400 pb-1 text-xs font-bold uppercase tracking-[.18em] text-blue-300">Browse the preview →</a>
      </div>
    </header>
    <section id="collection" aria-labelledby="collection-title" className="scroll-mt-16 bg-slate-100 text-slate-950">
      <div className="mx-auto max-w-screen-2xl px-4 pb-16 pt-8 sm:px-10"><Catalog /></div>
    </section>
  </div>
}
