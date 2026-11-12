'use client'

import styles from './Catalog.module.css'
import Image from 'next/image'
import { useState } from 'react'

const products = [
  { name: 'Weighted Velocity Ball Set', image: 'plyos', category: 'Throwing', price: 49.99, variant: 'Six weights · Bag included' },
  { name: 'Pro Arm Care Bands', image: 'bands', category: 'Throwing', price: 29.99, variant: 'Wrist cuff pair' },
  { name: 'Pro Capture Tripod', image: 'tripod', category: 'Capture', price: 34.99, variant: 'Clamp and case included' },
  { name: 'Everyday Trucker Hat', image: 'cap', category: 'Apparel', price: 29.99, variant: 'White mesh' },
  { name: 'Performance Pullover Hoodie', image: 'hoodie', category: 'Apparel', price: 54.99, variant: 'White' },
  { name: 'Lightweight Performance Tee', image: 'tee', category: 'Apparel', price: 29.99, variant: 'Light blue' },
  { name: 'Everyday Performance Backpack', image: 'backpack', frontImage: 'backpack-front', category: 'Everyday', price: 49.99, variant: 'Black' },
]

export default function Catalog() {
  const [category, setCategory] = useState('All Gear')
  const [sort, setSort] = useState('featured')
  const visible = products.filter(product => category === 'All Gear' || product.category === category)
  if (sort === 'low') visible.sort((a, b) => a.price - b.price)
  if (sort === 'high') visible.sort((a, b) => b.price - a.price)

  return <>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <h2 id="collection-title" className="text-3xl font-black tracking-tight">Training essentials</h2>
        <span aria-live="polite" className="border-l border-slate-300 pl-4 text-sm text-brand-paperText">{visible.length} {visible.length === 1 ? 'product' : 'products'}</span>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Product category">
        {['All Gear', 'Throwing', 'Capture', 'Apparel', 'Everyday'].map(item =>
          <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}
            className="min-h-11 rounded border border-brand-paperLine px-4 py-2 text-sm font-semibold aria-pressed:border-brand-ink aria-pressed:bg-brand-ink aria-pressed:text-white">{item}</button>)}
      </div>
      <select aria-label="Sort products" value={sort} onChange={e => setSort(e.target.value)}
        className="min-h-11 rounded border border-brand-paperLine bg-white px-3 py-2 text-sm font-semibold">
        <option value="featured">Collection order</option><option value="low">Price: Low to high</option><option value="high">Price: High to low</option>
      </select>
    </div>
    <p className="mb-4 text-sm text-brand-paperText">Product mockups and proposed USD prices. Gear orders are closed.</p>
    <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
      {visible.map(product => <li key={product.image} id={product.image} style={{ scrollMarginTop: 96 }} className={styles.product}>
        <div className="relative aspect-[5/4] overflow-hidden bg-slate-100">
          <Image src={'/shop/' + (product.frontImage ?? product.image) + '.webp'} alt={product.name} fill sizes="(min-width: 1024px) 25vw, (min-width: 480px) 50vw, 100vw" className={styles.front} />
          <Image src={'/shop/' + product.image + '-angle.webp'} alt="" fill sizes="(min-width: 1024px) 25vw, (min-width: 480px) 50vw, 100vw" className={styles.angle} />
        </div>
        <div className="p-4">
          <h3 className="text-lg font-bold leading-tight tracking-tight">{product.name}</h3>
          <p className="mt-1 text-sm text-brand-paperText">{product.variant}</p>
          <p className="price-figure mt-4 text-lg">${product.price.toFixed(2)}</p>
        </div>
      </li>)}
    </ul>
  </>
}
