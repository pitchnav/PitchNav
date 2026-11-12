import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { PitchCard } from './PitchCard'
import { PitchIntelligence } from './PitchIntelligence'
import styles from './PublicHome.module.css'

const resources = [
  ['Get your camera angle right', 'Set up a side view for a delivery review.', '/camera-setup'],
  ['See a sample report', 'Read the kind of feedback a pitcher gets back.', '/sample-report'],
  ['Compare development plans', 'See what each plan includes and what it costs.', '/pricing'],
]

export function PublicHome() {
  const localReel = process.env.NODE_ENV === 'development' && !!process.env.PITCHNAV_LOCAL_MOTION_DIR
  const mediaBase = localReel ? '/api/dev-motion' : process.env.PITCHNAV_APPROVED_MOTION_BASE
  return <div className={styles.home}>
    <section className={styles.hero}>
      <div className={styles.intro}>
        <p className={styles.byline}>Pitching analysis &amp; development</p>
        <div className={styles.headline}><h1><span>A plan for</span>{' '}<span>your next</span>{' '}<span>bullpen.</span></h1></div>
        <div className={styles.details}><p className={styles.lede}>Send in a delivery from the side. A coach reviews the throw and gives you a drill to take back to the mound.</p>
        <div className={styles.actions}><Link className="btn-action" href="/pricing">See analysis plans <ArrowRight size={17} aria-hidden="true"/></Link><Link href="/sample-report">See a sample report <span aria-hidden="true">↗</span></Link></div></div>
      </div>
      <PitchCard mediaBase={mediaBase} />
      <PitchIntelligence />
    </section>
    <section className={styles.desk} aria-labelledby="work-title">
      <div><p className={styles.byline}>From the bullpen</p><h2 id="work-title">Before you throw.</h2><p>Start with the setup, see what a review covers, or find a plan that fits your season.</p></div>
      <div className={styles.links}>{resources.map(([name,description,href])=><Link key={href} href={href}><span><strong>{name}</strong><small>{description}</small></span><ArrowRight size={20} aria-hidden="true"/></Link>)}</div>
    </section>
    <section className={styles.fieldnote}><div><h2>On the mound with an iPhone.</h2><p>We’re testing a capture app for bullpen sessions. See how the replay works and which pitch measurements are still being validated.</p></div><Link href="/pitch-metrics">See the tracking preview <ArrowRight size={17} aria-hidden="true"/></Link></section>
  </div>
}
