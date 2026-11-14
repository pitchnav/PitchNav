import type { MechanicsFinding } from './mechanics-findings'

export const figure8Drill = 'Figure 8 Rhythm Rocker'
export const janitorDrill = 'Janitor Throws'

/** A preference for an observed problem. Callers still check assignments, availability and restrictions. */
export function preferredReviewedDrill(finding: MechanicsFinding): string | null {
  if (finding.verdict !== 'observed') return null
  const claims = finding.answer.toLowerCase().replaceAll('’', "'").split(/[.!?;\n]+/)
  // A signed finding may mention a different mechanism to explicitly rule it out.
  const positive = claims.filter(claim => !/\b(?:no evidence|no clear|cannot tell|can't tell|unclear whether|ruled out|if you|if the)\b/.test(claim))
  const lateBreak = positive.some(claim => /\b(?:hands? (?:separate[ds]?|breaks?|broke) (?:too )?late|(?:delayed|late) hand (?:break|separation))\b/.test(claim) &&
    !/\b(?:not|without|isn't)\b/.test(claim))
  if (lateBreak) return null

  const contact = finding.foot_strike
  if (contact) {
    return contact.contact_status === 'bracketed' && contact.arm_timing === 'issue_visible' && contact.hand_up_l === 'absent'
      ? figure8Drill : null
  }
  if ([208, 209].includes(finding.flag_id ?? 0)) return figure8Drill
  const landingOrStride = finding.evidence_keys?.some(key => ['lead_foot_contact', 'hand_separation'].includes(key))
  if (landingOrStride && positive.some(claim =>
    /\b(?:hand|wrist|forearm)\b.{0,40}\b(?:stays?|stayed|lingers?|lingered|remains?|remained|continues?|continued|still) (?:too )?(?:low|below)\b/.test(claim) &&
    /\b(?:before|as|until|after|through|while)\b/.test(claim))) return figure8Drill

  const rearSide = /\b(?:back|rear|drive)[- ](?:hip|leg)\b/
  const deniesLoss = /\b(?:not|never|without|no|don't|doesn't|didn't)\s+(?:a |any |clearly )?(?:lose[sd]?|losing|lost|loss|lack|comes? out|stands? up|straightens?)\b/
  if (positive.some(claim => rearSide.test(claim) && !deniesLoss.test(claim) && (
    /\b(?:loses?|lost|lacks?|lacked|misses?|missed|insufficient|shallow|limited|missing|without|little)\b.{0,30}\bhing(?:e|es|ed|ing)\b/.test(claim) ||
    /\b(?:never|fails? to|does(?: not|n't)|did(?: not|n't))\s+(?:(?:establish|keep|maintain|reach|find)\s+(?:(?:a|the|its|your|that|back|rear|drive|hip)[ -])*)?hing(?:e|es|ed|ing)\b/.test(claim) ||
    /\bout of (?:the |your |its )?hinge (?:too )?early\b/.test(claim) ||
    /\bhinge\b.{0,18}\b(?:is|was) (?:shallow|limited|missing)\b/.test(claim)
  ))) return janitorDrill
  return null
}
