# Creative brief — Flagship Ad — Understand Your Delivery

Generated from `content/video-campaigns/flagship-understand-your-delivery.campaign.json` by `content/scripts/generate-video-brief.mjs`.
Do not hand-edit this file — edit the campaign JSON and regenerate.

## Master creative direction

**Objective:** The single hero Pitch Nav ad: establish the core product promise (a slow-motion video reveals what full speed hides) with premium, restrained pacing, then convert to a paid analysis.
**Audience:** Broad primary audience — competitive pitchers 13-18 and their parents, plus pitching coaches evaluating the product for their athletes.
**Tone:** Premium sports-tech. Near-black/navy backgrounds, electric blue accents, white condensed headlines, real footage first. Not loud, not childish, not sensational. See `content/editing-style-rules.md`.
**Core insight:** A delivery can look sound at full speed while the upper half is already rotating before the front side becomes stable — visible only once the video is stopped at foot strike.
**Open loop → payoff:** "This looks like a good delivery…" sets an expectation the very next line undercuts — the viewer keeps watching to see what the freeze frame reveals. → The freeze frame and overlay reveal the pattern; a second rep proves it's repeatable; the dashboard shows Pitch Nav surfaces exactly this kind of detail automatically.
**Hook:** "THIS LOOKS LIKE A GOOD DELIVERY…" (category: mechanics-mystery)
**Duration:** 30s
**CTA:** Start your Pitch Nav analysis. ($25/month)

## Scene-by-scene direction

### Scene scene-1 (0:00-0:02)
**REAL FOOTAGE ONLY** — do not generate, capture or source per the shot list
- Visual beat: Open on real action, immediately
- Direction: Real full-speed side-view pitch, no logo animation, no slow build.
- On-screen text: THIS LOOKS LIKE A GOOD DELIVERY…
- Sound: Single low tick on the cut in; music bed starts quiet.

### Scene scene-2 (0:02-0:05)
**REAL FOOTAGE ONLY** — do not generate, capture or source per the shot list
- Visual beat: Visual proof continues, tension builds toward the freeze
- Direction: Same rep continues at full speed, then eases into slow motion as it approaches foot strike.
- Sound: Speed-ramp whoosh as slow motion begins.

### Scene scene-3 (0:05-0:11)
**AI-ELIGIBLE** — background/motion-graphic/diagram content only, feed to the video-prompt-builder skill
- Visual beat: Freeze at the key phase, reveal the pattern
- Direction: Hard freeze at foot strike. Blue overlay animates onto the shoulders/hips to highlight the rotation-vs-stability pattern.
- On-screen text: UNTIL YOU STOP IT HERE.
- Voice-over: "At full speed, this looks normal. But when we stop it at foot strike, the upper half begins rotating before the front side becomes stable."
- Sound: Freeze-frame stop accent; overlay draw-on sound, subtle; music dips under VO.
  - One-line creative brief for the skill: "Freeze at the key phase, reveal the pattern — Blue overlay highlighting the rotation-vs-stability pattern, matching Pitch Nav's near-black/navy background with electric blue (#2563eb) accents, no readable text baked into the generated element."

### Scene scene-4 (0:11-0:16)
**REAL FOOTAGE ONLY** — do not generate, capture or source per the shot list
- Visual beat: Curiosity loop — second rep confirms the pattern
- Direction: Cut to a second rep, same freeze-and-overlay treatment at the same phase.
- On-screen text: SAME PATTERN. ANOTHER PITCH.
- Sound: Freeze-frame stop accent, second instance, slightly harder.

### Scene scene-5 (0:16-0:25)
**REAL FOOTAGE ONLY** — do not generate, capture or source per the shot list
- Visual beat: Pitch Nav product output
- Direction: Screen recording: dashboard and report, moving through priority, drills, and progress tracking — not a static frame.
- Voice-over: "Pitch Nav turns your slow-motion pitching video into a clear mechanics breakdown, a development priority, drills, and progress tracking."
- Sound: UI tap accents, sparing; music builds slightly toward the final card.

### Scene scene-6 (0:25-0:30)
**REAL FOOTAGE ONLY** — do not generate, capture or source per the shot list
- Visual beat: Final screen — one clear CTA
- Direction: Static end card: wordmark small at top, headline, CTA, price, and small-print disclaimer beneath.
- On-screen text: UNDERSTAND YOUR DELIVERY. / START YOUR ANALYSIS. / $25/MONTH / Video-based training estimates. Not medical or laboratory measurements.
- Voice-over: "Understand your delivery. Start your Pitch Nav analysis. Twenty-five dollars a month."
- Sound: Music resolves; no additional SFX.

## Editing timeline

- 0:00-0:02 — Open on real action, immediately
- 0:02-0:05 — Visual proof continues, tension builds toward the freeze
- 0:05-0:11 — Freeze at the key phase, reveal the pattern
- 0:11-0:16 — Curiosity loop — second rep confirms the pattern
- 0:16-0:25 — Pitch Nav product output
- 0:25-0:30 — Final screen — one clear CTA

## Voice-over script

At full speed, this looks normal. But when we stop it at foot strike, the upper half begins rotating before the front side becomes stable. Pitch Nav turns your slow-motion pitching video into a clear mechanics breakdown, a development priority, drills, and progress tracking. Understand your delivery. Start your Pitch Nav analysis. Twenty-five dollars a month.

## On-screen caption script

- THIS LOOKS LIKE A GOOD DELIVERY…
- UNTIL YOU STOP IT HERE.
- SAME PATTERN. ANOTHER PITCH.
- UNDERSTAND YOUR DELIVERY.
- START YOUR ANALYSIS.
- $25/MONTH
- Video-based training estimates. Not medical or laboratory measurements.

## Sound-effect plan

Music bed under everything, ducked below voice-over, building slightly toward the final card. One whoosh on the speed ramp, two freeze-frame stop accents, sparing UI taps. No glitch transitions, no screen shake.

## B-roll requirements

Two reps from the same athlete, matched phase-to-phase, same freeze point (foot strike) both times. Dashboard footage must be a real, moving screen recording — not a static screenshot — and must show the priority, drills, and progress-tracking views the VO names.

## Transitions

See the technique menu in `content/video-templates/timelines/_pacing-techniques.md`. This campaign's per-scene transition notes are captured in each scene's "Direction" line above.

## Export specifications

Platform(s): instagram-ads, website — see `content/exports/export-presets.json` for the matching preset(s) and `content/exports/export-presets.md` for the paid-ad-specific timing rules.

## Thumbnail / cover-frame concept

First-frame text: "THIS LOOKS LIKE A GOOD DELIVERY…" over the opening visual described in Scene scene-1. Should look like a normal highlight clip until the caption creates doubt or curiosity.

## Alternative hook versions

- "Can you spot what happens before foot strike?" (mechanics-mystery)
- "This looks normal until you freeze this frame." (mechanics-mystery)
- "The biggest issue is not where you think it is." (mechanics-mystery)

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
