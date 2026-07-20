# Creative brief — Launch Ad 1 — Mechanical Problem Hook

Generated from `content/video-campaigns/launch-ad-01-mechanical-problem.campaign.json` by `content/scripts/generate-video-brief.mjs`.
Do not hand-edit this file — edit the campaign JSON and regenerate.

## Master creative direction

**Objective:** Stop competitive pitchers/parents mid-scroll with a mechanics observation, then convert to a Pitch Nav analysis.
**Audience:** Competitive travel-ball and high-school pitchers (14-18) who train seriously and follow pitching content, plus the parent who makes the purchase decision.
**Tone:** Premium sports-tech. Near-black/navy backgrounds, electric blue accents, white condensed headlines, real footage first. Not loud, not childish, not sensational. See `content/editing-style-rules.md`.
**Core insight:** A delivery can look clean at full speed while a specific mechanical pattern — the upper half rotating before the front side is stable — is easy to miss without frame-by-frame video.
**Open loop → payoff:** The hook promises something is wrong with a delivery that looks fine — the viewer keeps watching to see what it is. → The freeze frame and blue overlay show the exact moment and pattern; a second rep confirms it's repeatable, not a fluke.
**Hook:** "This looks normal until you freeze this frame." (category: mechanics-mystery)
**Duration:** 30s
**CTA:** Start your Pitch Nav analysis. ($25/month)

## Scene-by-scene direction

### Scene scene-1 (0:00-0:02)
**REAL FOOTAGE ONLY** — do not generate, capture or source per the shot list
- Visual beat: Pattern-interrupt hook
- Direction: Real full-speed side-view pitch, mid-windup, hard cut in — no logo, no intro.
- On-screen text: THIS LOOKS NORMAL
- Sound: Single low tick on the cut in.

### Scene scene-2 (0:02-0:05)
**REAL FOOTAGE ONLY** — do not generate, capture or source per the shot list
- Visual beat: Immediate visual proof
- Direction: Same rep continues, ease into slow motion at foot strike.
- On-screen text: UNTIL FOOT STRIKE
- Voice-over: "At full speed, everything here looks normal."
- Sound: Speed-ramp whoosh into slow motion.

### Scene scene-3 (0:05-0:10)
**AI-ELIGIBLE** — background/motion-graphic/diagram content only, feed to the video-prompt-builder skill
- Visual beat: Reveal the problem
- Direction: Freeze frame at foot strike; blue joint-marker overlay animates onto shoulders/hips.
- On-screen text: UPPER HALF OPENS EARLY
- Voice-over: "But stop it right at foot strike, and the upper half is already rotating before the front side is stable."
- Sound: Freeze-frame stop accent; overlay draw-on sound, subtle.
  - One-line creative brief for the skill: "Reveal the problem — Blue joint-marker/angle overlay graphic, matching Pitch Nav's near-black/navy background with electric blue (#2563eb) accents, no readable text baked into the generated element."

### Scene scene-4 (0:10-0:15)
**REAL FOOTAGE ONLY** — do not generate, capture or source per the shot list
- Visual beat: Curiosity loop / repeated pattern
- Direction: Split screen: rep 1 freeze frame (left) and rep 2 freeze frame (right), same phase, same overlay.
- On-screen text: SAME PATTERN AGAIN
- Voice-over: "Same pattern. Another pitch. It's not a one-time thing."
- Sound: Split-screen wipe.

### Scene scene-5 (0:15-0:21)
**REAL FOOTAGE ONLY** — do not generate, capture or source per the shot list
- Visual beat: Coaching insight / solution
- Direction: Cut to a single drill rep addressing front-side stability; caption states the priority.
- On-screen text: ONE CLEAR PRIORITY / PERSONALIZED DRILLS
- Voice-over: "One priority: stabilize the front side before the rotation starts. That's what the drill work targets."
- B-roll: Drill demonstration, front-side stability drill, real footage
- Sound: Music bed enters, low under VO.

### Scene scene-6 (0:21-0:26)
**REAL FOOTAGE ONLY** — do not generate, capture or source per the shot list
- Visual beat: Pitch Nav product output
- Direction: Screen recording: report view scrolling to priority + drills + progress calendar.
- On-screen text: TRACK YOUR PROGRESS
- Voice-over: "Pitch Nav turns one slow-motion video into a clear breakdown — one priority, personalized drills, and progress you can track."
- Sound: UI tap accents, sparing.

### Scene scene-7 (0:26-0:30)
**REAL FOOTAGE ONLY** — do not generate, capture or source per the shot list
- Visual beat: One clear CTA
- Direction: Static end card: wordmark small at top, CTA centered, price beneath.
- On-screen text: START YOUR ANALYSIS / $25/MONTH
- Voice-over: "Start your Pitch Nav analysis. $25 a month."
- Sound: Music resolves; no additional SFX.

## Editing timeline

- 0:00-0:02 — Pattern-interrupt hook
- 0:02-0:05 — Immediate visual proof
- 0:05-0:10 — Reveal the problem
- 0:10-0:15 — Curiosity loop / repeated pattern
- 0:15-0:21 — Coaching insight / solution
- 0:21-0:26 — Pitch Nav product output
- 0:26-0:30 — One clear CTA

## Voice-over script

At full speed, everything here looks normal. But stop it right at foot strike, and the upper half is already rotating before the front side is stable. Same pattern. Another pitch. It's not a one-time thing. One priority: stabilize the front side before the rotation starts. That's what the drill work targets. Pitch Nav turns one slow-motion video into a clear breakdown — one priority, personalized drills, and progress you can track. Start your Pitch Nav analysis. $25 a month.

## On-screen caption script

- THIS LOOKS NORMAL
- UNTIL FOOT STRIKE
- UPPER HALF OPENS EARLY
- SAME PATTERN AGAIN
- ONE CLEAR PRIORITY
- PERSONALIZED DRILLS
- TRACK YOUR PROGRESS
- START YOUR ANALYSIS
- $25/MONTH

## Sound-effect plan

Music bed under everything, ducked below voice-over. One whoosh on the speed ramp, one tick on the hook cut, one soft accent on the overlay draw-on. No glitch transitions.

## B-roll requirements

Two reps from the same athlete, matched phase-to-phase. Drill footage is real, one rep, no more. Product screens are real, live UI, no mockups.

## Transitions

See the technique menu in `content/video-templates/timelines/_pacing-techniques.md`. This campaign's per-scene transition notes are captured in each scene's "Direction" line above.

## Export specifications

Platform(s): instagram-ads — see `content/exports/export-presets.json` for the matching preset(s) and `content/exports/export-presets.md` for the paid-ad-specific timing rules.

## Thumbnail / cover-frame concept

First-frame text: "This looks normal until you freeze this frame." over the opening visual described in Scene scene-1. Should look like a normal highlight clip until the caption creates doubt or curiosity.

## Alternative hook versions

- "Can you spot what happens before foot strike?" (mechanics-mystery)
- "The biggest issue is not where you think it is." (mechanics-mystery)
- "Watch his front leg. Now watch it again." (mechanics-mystery)

---

## Next step

For every scene flagged **AI-ELIGIBLE** above, ask Claude to use the
video-prompt-builder skill with that scene's one-line creative brief as
input, explicitly constrained to: abstract sports-tech backgrounds, motion
graphics, clean transitions, explanatory diagrams, or non-human UI-style
visuals. Never ask it to generate a synthetic athlete, presenter, or
footage that could pass as real. Scenes flagged **REAL FOOTAGE ONLY** are
out of scope for the skill — they come from the shot lists in
`content/shot-lists/`.
