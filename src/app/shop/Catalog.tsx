'use client'

import Image from 'next/image'
import { ArrowDown, ArrowUpRight, X } from 'lucide-react'
import { useRef, useState } from 'react'
import styles from './Catalog.module.css'

const products = [
  { name: 'Weighted Velocity Ball Set', image: 'plyos', category: 'Throwing', price: 49.99, variant: 'Six weights · Bag included' },
  { name: 'Pro Arm Care Bands', image: 'bands', category: 'Throwing', price: 29.99, variant: 'Wrist cuff pair' },
  { name: 'Pro Capture Tripod', image: 'tripod', category: 'Capture', price: 34.99, variant: 'Clamp and case included' },
  { name: 'Everyday Trucker Hat', image: 'cap', category: 'Apparel', price: 29.99, variant: 'White mesh' },
  { name: 'Performance Pullover Hoodie', image: 'hoodie', category: 'Apparel', price: 54.99, variant: 'White' },
  { name: 'Lightweight Performance Tee', image: 'tee', category: 'Apparel', price: 29.99, variant: 'Light blue' },
  { name: 'Everyday Performance Backpack', image: 'backpack', frontImage: 'backpack-front', category: 'Everyday', price: 49.99, variant: 'Black' },
]
type Product = (typeof products)[number]
const featured = products[0]
function photo(product: Product, alternate = false) {
  return '/shop/' + (alternate ? product.image + '-angle' : product.frontImage ?? product.image) + '.webp'
}

export default function Catalog() {
  const [category, setCategory] = useState('All gear')
  const [sort, setSort] = useState('featured')
  const [detail, setDetail] = useState<Product>(featured)
  const [alternate, setAlternate] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const visible = products.filter(product => category === 'All gear' || product.category === category)
  if (sort === 'low') visible.sort((a, b) => a.price - b.price)
  if (sort === 'high') visible.sort((a, b) => b.price - a.price)

  function showProduct(product: Product, button: HTMLButtonElement) {
    opener.current = button
    setDetail(product)
    setAlternate(false)
    dialog.current?.showModal()
  }

  return <div className={styles.shop}>
    <header className={styles.hero}>
      <div className={styles.heroInner}>
        <div className={styles.intro}>
          <h1>Bullpen <br />supply<span>.</span></h1>
          <p>Throwing gear, camera equipment and apparel from Pitch Nav.</p>
          <a className="btn-action" href="#collection">Browse the collection <ArrowDown size={16} aria-hidden="true" /></a>
        </div>
        <button className={styles.featured} type="button" aria-label={`Preview ${featured.name}`}
          onClick={event => showProduct(featured, event.currentTarget)}>
          <span className={styles.heroPhoto}><Image src={photo(featured, true)} alt="" fill sizes="(min-width: 900px) 480px, 80vw" preload /></span>
          <span className={styles.caption}><span>{featured.name}</span><ArrowUpRight size={20} aria-hidden="true" /></span>
        </button>
      </div>
    </header>
    <section id="collection" aria-labelledby="collection-title" className={styles.collection}>
      <div className={styles.collectionHead}>
        <div><h2 id="collection-title">The collection</h2><p>Product mockups and proposed prices in USD. Orders are closed.</p></div>
        <label className={styles.sort}>Sort by
          <select value={sort} onChange={event => setSort(event.target.value)}>
            <option value="featured">Featured</option><option value="low">Price, low to high</option><option value="high">Price, high to low</option>
          </select>
        </label>
      </div>
      <div className={styles.toolbar}>
        <div role="group" aria-label="Product category" className={styles.filters}>
          {['All gear', 'Throwing', 'Capture', 'Apparel', 'Everyday'].map(item => <button key={item} type="button"
            aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
        <span className={styles.count} role="status">{visible.length} {visible.length === 1 ? 'item' : 'items'}</span>
      </div>
      <ul className={styles.grid}>
        {visible.map(product => <li key={product.image} id={product.image}>
          <button type="button" className={styles.product} onClick={event => showProduct(product, event.currentTarget)}
            aria-label={`Preview ${product.name}, $${product.price.toFixed(2)}`}>
            <span className={styles.imageField}>
              <Image src={photo(product)} alt="" fill sizes="(min-width: 1100px) 365px, (min-width: 800px) 31vw, (min-width: 540px) 46vw, 90vw" />
              <span className={styles.inspect}><ArrowUpRight size={18} aria-hidden="true" /></span>
            </span>
            <span className={styles.productInfo}><span className={styles.name}>{product.name}</span><span className={styles.cost}>${product.price.toFixed(2)}</span></span>
            <span className={styles.variant}>{product.variant}</span>
          </button>
        </li>)}
      </ul>
    </section>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="product-title" onClose={() => opener.current?.focus({ preventScroll: true })}
      onClick={event => { if (event.target === event.currentTarget) dialog.current?.close() }}>
      <div className={styles.detail}>
        <button type="button" className={styles.close} aria-label="Close product preview" onClick={() => dialog.current?.close()}><X size={22} /></button>
        <div className={styles.detailPhoto}><Image src={photo(detail, alternate)} alt={`${detail.name}, ${alternate ? 'alternate' : 'front'} view`}
          fill sizes="(min-width: 700px) 420px, 90vw" /></div>
        <div className={styles.detailText}><p className={styles.variant}>{detail.category}</p><h2 id="product-title">{detail.name}</h2>
          <p className={styles.cost}>${detail.price.toFixed(2)}</p><p>{detail.variant}</p>
          <div role="group" aria-label="Product photos" className={styles.views}>
            <button type="button" aria-pressed={!alternate} onClick={() => setAlternate(false)}>Front view</button>
            <button type="button" aria-pressed={alternate} onClick={() => setAlternate(true)}>Alternate view</button>
          </div>
          <p className={styles.availability}>Proposed price in USD. Orders are closed.</p>
        </div>
      </div>
    </dialog>
  </div>
}
