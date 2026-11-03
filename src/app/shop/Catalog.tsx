'use client'

import Image from 'next/image'
import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'

const products = [
  { name: 'Training hoodie', image: 'hoodie', category: 'Apparel', price: 54.99, detail: 'White pullover with the Pitch Nav chest mark.' },
  { name: 'Training tee', image: 'tee', category: 'Apparel', price: 29.99, detail: 'Light blue short sleeve for the field or weight room.' },
  { name: 'Mesh-back cap', image: 'cap', category: 'Apparel', price: 29.99, detail: 'White mesh back with a blue embroidered front mark.' },
  { name: 'Bullpen backpack', image: 'backpack', category: 'Accessories', price: 49.99, detail: 'A bag for your gear on bullpen days. Front zip pocket and mesh side pockets.' },
  { name: 'Arm care bands', image: 'bands', category: 'Training gear', price: 29.99, detail: 'Wrist cuffs and a clip for your pre-throw band work.' },
  { name: 'Plyo ball set', image: 'plyos', category: 'Training gear', price: 49.99, recommended: true, detail: 'Six marked training weights with a drawstring bag.' },
  { name: 'Phone tripod', image: 'tripod', category: 'Accessories', price: 34.99, detail: 'A phone clamp and carrying case for filming your delivery.' },
]

export default function Catalog() {
  const [expanded, setExpanded] = useState(false)
  const [category, setCategory] = useState('All')
  const [sort, setSort] = useState('featured')
  const visible = products.filter(product => category === 'All' || product.category === category)
  if (sort === 'low') visible.sort((a, b) => a.price - b.price)
  if (sort === 'high') visible.sort((a, b) => b.price - a.price)

  return <>
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-700 px-4 py-4 sm:px-8">
      <button type="button" aria-expanded={expanded} aria-controls="shop-filters" onClick={() => setExpanded(!expanded)}
        className="flex min-h-11 items-center gap-2 rounded border border-slate-600 px-3 text-sm font-semibold hover:border-electric-blue-light">
        <SlidersHorizontal size={15} />Filters{category !== 'All' && ' (1)'}
      </button>
      <select aria-label="Sort products" value={sort} onChange={e => setSort(e.target.value)}
        className="min-h-11 rounded border border-slate-600 bg-navy-950 px-2 text-sm font-semibold">
        <option value="featured">Sort: Featured</option>
        <option value="low">Price: Low to high</option>
        <option value="high">Price: High to low</option>
      </select>
      <span aria-live="polite" className="ml-auto text-xs text-slate-300">{visible.length} items</span>
    </div>
    <div id="shop-filters" hidden={!expanded}>
      <div className="flex flex-wrap gap-2 px-4 pb-4 sm:px-8" role="group" aria-label="Product category">
        {['All', 'Apparel', 'Training gear', 'Accessories'].map(item =>
          <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}
            className="min-h-11 rounded px-3 text-sm text-slate-300 aria-pressed:bg-electric-blue aria-pressed:text-white">{item}</button>)}
      </div>
    </div>
    <ul className="grid grid-cols-2 gap-x-1 gap-y-7 lg:grid-cols-3">
      {visible.map(product => <li key={product.image}>
        <div className="relative aspect-square bg-white">
          <Image src={'/shop/' + product.image + '.webp'} alt={product.name} fill sizes="(min-width: 1024px) 33vw, 50vw" className="object-contain" />
          {product.recommended && <span className="absolute bottom-2 right-2 rounded-sm bg-navy-950 px-2 py-1 text-xs font-semibold text-white sm:bottom-4 sm:right-4">Recommended</span>}
        </div>
        <div className="px-3 pt-3 sm:px-5">
          <h2 className="font-bold sm:text-xl">{product.name}</h2>
          <p className="mt-1 text-sm text-slate-300">{product.detail}</p>
          <p className="mt-2 font-semibold">${product.price.toFixed(2)}</p>
        </div>
      </li>)}
    </ul>
  </>
}
