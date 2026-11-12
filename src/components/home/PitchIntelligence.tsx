import Image from 'next/image'
import { MetricHelp } from '@/components/pitch-data/MetricHelp'
import styles from './PublicHome.module.css'

const metrics = [
  ['velocity','Release velo','91.4 mph'], ['spin','Spin rate','2,247 rpm'], ['axis','Spin axis','11:30'], ['efficiency','Spin efficiency','94%'],
  ['hb','Horizontal break','15.2 in'], ['ivb','Vertical break','17.8 in'], ['stuff','Stuff+','112'], ['pitchType','Pitch type','Four-seam'],
] as const

export function PitchIntelligence({ showcase = false }: { showcase?: boolean }) {
  return <section className={showcase ? `${styles.intel} ${styles.showcase}` : styles.intel} aria-labelledby="pitch-intel-title">
    <div className={styles.intelHeading}>
      <p>Pitch intelligence</p><h2 id="pitch-intel-title">Every pitch. A clearer picture.</h2><small>Sample data</small>
    </div>
    <Image className={styles.intelArt} src="/media/home/pitch-intelligence.webp" width={1881} height={836} sizes={showcase ? "(max-width: 1100px) 94vw, 1000px" : "(max-width: 899px) 94vw, 58vw"} alt="" />
    <Image className={styles.intelModels} src="/media/home/pitch-intelligence-models.webp" width={655} height={366} alt="Sample strike zone with three locations next to a spin-axis model tilted toward 11:30." />
    <div className={styles.intelMetrics}>
      {metrics.map(([key,label,value])=><MetricHelp key={key} metric={key} icon={false} reading={value} className={styles.intelMetric}>
        <span>{label}</span><strong>{value}</strong>
      </MetricHelp>)}
    </div>
    <p className="sr-only">These sample readings illustrate a four-seam fastball. Select a metric to learn what it means.</p>
  </section>
}
