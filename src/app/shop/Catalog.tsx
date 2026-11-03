'use client'

import styles from './Catalog.module.css'
import Image from 'next/image'
import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'

const products = [
  { name: 'Weighted Velocity Ball Set', image: 'plyos', category: 'Training gear', price: 49.99, recommended: true, variant: 'Six weights · Bag included' },
  { name: 'Pro Arm Care Bands', image: 'bands', category: 'Training gear', price: 29.99, variant: 'Wrist cuff pair' },
  { name: 'Pro Capture Tripod', image: 'tripod', category: 'Accessories', price: 34.99, variant: 'Clamp and case included' },
  { name: 'Everyday Trucker Hat', image: 'cap', category: 'Apparel', price: 29.99, variant: 'White mesh' },
  { name: 'Performance Pullover Hoodie', image: 'hoodie', category: 'Apparel', price: 54.99, variant: 'White' },
  { name: 'Lightweight Performance Tee', image: 'tee', category: 'Apparel', price: 29.99, variant: 'Light blue' },
  { name: 'Everyday Performance Backpack', image: 'backpack', frontImage: 'backpack-front', category: 'Accessories', price: 49.99, variant: 'Black' },
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
      {visible.map(product => <li key={product.image} className={product.recommended ? styles.recommendedProduct : styles.product}>
        <div className="relative aspect-square overflow-hidden bg-white">
          <Image src={'/shop/' + (product.frontImage ?? product.image) + '.webp'} alt={product.name} fill sizes="(min-width: 1024px) 33vw, 50vw" className="object-contain" />
          <Image src={'/shop/' + product.image + '-angle.webp'} alt="" fill sizes="(min-width: 1024px) 33vw, 50vw" className={styles.angle} />
          {product.recommended && <span className="absolute bottom-2 right-2 rounded-sm bg-navy-950 px-2 py-1 text-xs font-semibold text-white sm:bottom-4 sm:right-4">Recommended</span>}
        </div>
        <div className="space-y-0.5 px-3 pt-3 font-['Helvetica_Neue',Arial,sans-serif] text-[15px] font-normal leading-snug sm:px-5 sm:text-base">
          <h2 className="font-normal tracking-tight text-slate-50">{product.name}</h2>
          <p className="text-slate-400">{product.variant}</p>
          <p className="text-slate-300 tabular-nums">${product.price.toFixed(2)}</p>
        </div>
      </li>)}
    </ul>
  </>
}
