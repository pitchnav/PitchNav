import Image from 'next/image'

export const metadata = { title: 'Shop', description: 'Preview the Pitch Nav apparel and training gear collection.' }

const products = [
  { name: 'Training hoodie', image: 'hoodie', price: '$54.99', detail: 'White pullover with the Pitch Nav chest mark.' },
  { name: 'Training tee', image: 'tee', price: '$29.99', detail: 'Light blue short sleeve for the field or weight room.' },
  { name: 'Mesh-back cap', image: 'cap', price: '$29.99', detail: 'White mesh back with a blue embroidered front mark.' },
  { name: 'Bullpen backpack', image: 'backpack', price: '$49.99', detail: 'A bag for your gear on bullpen days. Front zip pocket and mesh side pockets.' },
  { name: 'Arm care bands', image: 'bands', price: '$29.99', detail: 'Wrist cuffs and a clip for your pre-throw band work.' },
  { name: 'Plyo ball set', image: 'plyos', price: '$49.99', recommended: true, detail: 'Six marked training weights with a drawstring bag.' },
  { name: 'Phone tripod', image: 'tripod', price: '$34.99', detail: 'A phone clamp and carrying case for filming your delivery.' },
]

export default function ShopPage() {
  return <main className="min-h-screen bg-navy-950 px-4 pb-20 pt-28 sm:px-6">
    <div className="mx-auto max-w-6xl">
      <p className="text-sm font-bold uppercase tracking-widest text-electric-blue-light">Collection preview</p>
      <h1 className="mt-3 text-5xl font-black text-white">Pitch Nav Shop</h1>
      <p className="my-6 text-slate-300">A first look at our gear for the pen, the weight room and the road. Orders haven’t opened yet.</p>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{products.map(product =>
        <li key={product.name} className="card overflow-hidden">
          <div className="relative aspect-square overflow-hidden rounded-xl bg-white">
            <Image src={'/shop/' + product.image + '.webp'} alt={product.name + ' concept'} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-contain" />
            {product.recommended && <span className="absolute left-3 top-3 rounded-full bg-navy-950 px-3 py-1 text-sm font-bold text-white">Recommended</span>}
          </div>
          <div className="mt-4 flex items-baseline justify-between gap-3 text-white">
            <h2 className="text-xl font-bold">{product.name}</h2>
            <span className="font-semibold">{product.price}</span>
          </div>
          <p className="mt-2 text-sm text-slate-300">{product.detail}</p>
        </li>)}</ul>
    </div>
  </main>
}
