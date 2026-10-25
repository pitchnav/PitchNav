/**
 * Athlete advisors — college and pro players who advise Pitch Nav.
 *
 * NOT reviewers. These people do not read submissions or write feedback; they
 * advise on the product. That distinction is the entire reason this file is
 * separate from `src/lib/reviewers.ts`. Listing an advisor under a heading
 * like "Your review staff" would tell a paying parent that this person looked
 * at their kid's delivery, which is false.
 *
 * Each entry is a public factual claim about a named person's current
 * affiliation. Confirmed with Luke on 2026-10-25: all seven agreed to be
 * listed publicly, and all are currently in the positions shown.
 *
 * Two standing cautions for whoever edits this next:
 *
 * 1. NIL. Most of these are current NCAA athletes, and using their name and
 *    school to promote a paid product is an NIL arrangement. Schools
 *    generally require the athlete to disclose it to compliance, and the
 *    eligibility risk falls on THEM, not on Pitch Nav. Do not add a current
 *    college athlete here before they have cleared it on their end.
 * 2. School marks. Say what is true about the person -- "Notre Dame" as their
 *    affiliation -- and never imply the institution endorses Pitch Nav. No
 *    school logos, no "X Baseball partners with Pitch Nav".
 */

export interface Advisor {
  name: string
  /**
   * Current affiliation. Factual and checkable. Keep it to what is confirmed:
   * if a position ("Pitcher, Notre Dame") has not been verified for that
   * person, use the affiliation alone rather than assuming.
   */
  affiliation: string
  /** Earlier programs, where known. Optional. */
  previously?: string
  /** Path under /public. Falls back to initials when absent. */
  photo?: string
}

export const ADVISORS: Advisor[] = [
  { name: "Jack O'Connor", affiliation: 'Notre Dame', previously: 'UCLA' },
  { name: 'Cameron Appenzeller', affiliation: 'Tennessee' },
  { name: 'Brian Gould', affiliation: 'Creighton' },
  { name: 'AJ Calio', affiliation: 'Vanderbilt' },
  { name: 'Christian Little', affiliation: 'Mariners organization', previously: 'Vanderbilt, LSU' },
  { name: 'Laird Williams', affiliation: 'Tulane' },
]

export function hasAdvisors(): boolean {
  return ADVISORS.length > 0
}
