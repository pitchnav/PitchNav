import Catalog from './Catalog'

export const metadata = { title: 'Shop', description: 'Preview the Pitch Nav apparel and training gear collection.' }

export default function ShopPage() {
  return <main className="min-h-screen bg-navy-950 pb-20 pt-24 text-white">
    <header className="px-4 pb-6 sm:px-8">
      <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Pitch Nav Shop</h1>
      <p className="mt-2 text-slate-300">Gear for the bullpen and the weight room. Browse ahead of launch. You can use equipment you already own with your training plan.</p>
    </header>
    <Catalog />
  </main>
}
