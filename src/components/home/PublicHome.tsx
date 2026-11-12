import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { PitchCard } from './PitchCard'
import styles from './PublicHome.module.css'

const resources = [
  ['Get your camera angle right', 'Set up a side view for a delivery review.', '/camera-setup'],
  ['See a sample report', 'Read the kind of feedback a pitcher gets back.', '/sample-report'],
  ['Compare development plans', 'See what each plan includes and what it costs.', '/pricing'],
]

export function PublicHome() {
  return <div className={styles.home}>
    <section className={styles.hero}>
      <div className={styles.intro}>
        <p className={styles.byline}>Pitching analysis &amp; development</p>
        <h1>A plan for your next bullpen.</h1>
        <p className={styles.lede}>Send in a delivery from the side. A coach reviews the throw and gives you a drill to take back to the mound.</p>
        <div className={styles.actions}><Link className="btn-action" href="/pricing">See analysis plans <ArrowRight size={17} aria-hidden="true"/></Link><Link href="/sample-report">See a sample report <span aria-hidden="true">↗</span></Link></div>
      </div>
      <div className={styles.sample}><PitchCard/><p>Illustrative pitch data. <Link href="/arsenal">Explore the arsenal preview <span aria-hidden="true">↗</span></Link></p></div>
    </section>
    <section className={styles.desk} aria-labelledby="work-title">
      <div><p className={styles.byline}>From the bullpen</p><h2 id="work-title">Before you throw.</h2><p>Start with the setup, see what a review covers, or find a plan that fits your season.</p></div>
      <div className={styles.links}>{resources.map(([name,description,href])=><Link key={href} href={href}><span><strong>{name}</strong><small>{description}</small></span><ArrowRight size={20} aria-hidden="true"/></Link>)}</div>
    </section>
    <section className={styles.fieldnote}><div><h2>On the mound with an iPhone.</h2><p>We’re testing a capture app for bullpen sessions. See how the replay works and which pitch measurements are still being validated.</p></div><Link href="/pitch-metrics">See the tracking preview <ArrowRight size={17} aria-hidden="true"/></Link></section>
  </div>
}
