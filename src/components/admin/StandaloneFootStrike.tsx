'use client'

import { useState } from 'react'
import { FootStrikeReviewEditor } from './FootStrikeReviewEditor'
import { emptyFootStrike, footStrikeFinding, missingLandingFinding } from '@/lib/foot-strike-review'
import type { EvidenceFrame } from '@/components/reports/MechanicsFindings'
import type { MechanicsFinding } from '@/lib/mechanics-findings'

export function StandaloneFootStrike({ frame, initial }: { frame?: EvidenceFrame; initial?: MechanicsFinding }) {
  const [review, setReview] = useState({ ...emptyFootStrike, ...initial?.foot_strike })
  const [evidence, setEvidence] = useState(initial?.evidence ?? '')
  const [cue, setCue] = useState(initial?.coaching_action ?? '')
  const finding = frame ? footStrikeFinding(review, evidence, cue.trim() || null) : missingLandingFinding()
  return <>
    <input type="hidden" name="foot_strike_finding" value={JSON.stringify(finding)} />
    {frame ? <FootStrikeReviewEditor frame={frame} review={review} evidence={evidence} action={cue}
      onChange={setReview} onEvidence={setEvidence} onAction={setCue} /> :
      <p>Hand-up L at foot strike · View limited. No landing image is available for this assessment.</p>}
  </>
}
