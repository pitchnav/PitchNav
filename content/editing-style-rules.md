# Editing style rules

These rules apply to every video in the system, regardless of format,
length, or platform. When a script template and this file disagree, this
file wins.

## Pacing

- Open on action, never a logo animation.
- Remove all dead air — no pauses, no "and... so..." filler in voice-over.
- Avoid slow introductions. The hook is the first thing on screen.
- Display the central problem/observation immediately — don't build up to it
  for more than the timeline template allows.
- Visually change the frame every one to three seconds (cut, zoom, freeze,
  caption, overlay — see `content/video-templates/timelines/_pacing-techniques.md`).
- Use slow motion strategically — to reveal something, not as a default
  aesthetic.
- Use freeze frames only when a point is actively being explained. A freeze
  frame with no explanation reads as a mistake, not a technique.
- One main idea per video. If a script wants to make two points, that's two
  videos.
- One CTA. Never stack "follow us," "comment below," and the analysis CTA
  in the same video.
- Keep music below voice-over at all times — if you can't hear a word
  clearly, the mix is wrong.
- Use sound effects sparingly — reserve them for the 2-4 biggest beats, not
  every cut.

## What to avoid

- Overused glitch effects, VHS/zoom-blur transition packs
- Excessive screen shake
- Fake radar values or any invented measurement
- Fake testimonials, or real testimonials edited to imply something the
  athlete didn't say
- Unsupported scientific claims — if a sentence needs a citation to be true,
  don't say it
- Implying Pitch Nav diagnoses injuries or performs a medical assessment
- Promising or implying guaranteed velocity gains
- Presenting an estimate as if it were an exact, lab-grade measurement

## Labeling measurements

Match the product's own language (`CLAUDE.md` → Safety and accuracy rules):

- Pose measurements are video-based, 2D estimates. If a number appears on
  screen, it should read like the product's own report does — an estimate,
  not an exact figure.
- Velocity is only ever shown as an estimated range, and only when the
  underlying footage/calibration would actually support that in the real
  product. When in doubt, don't show a velocity number — show the mechanics
  breakdown instead, which doesn't require calibration to be honest.
- Never say "laboratory-grade," "medical," "diagnosis," or "guaranteed."

## Brand consistency

- Palette: near-black/navy backgrounds (`#05080f`–`#0d1629`), electric blue
  accent (`#2563eb`/`#3b82f6`), white text, occasional `#00e5a0` green for
  positive/progress indicators only (matches the product's own use of green
  for strengths/completion).
- Typography: Inter, bold/black weight, uppercase, tight tracking — see
  `content/captions/caption-tokens.ts`.
- Logo use is minimal — end cards and, optionally, a small persistent mark
  top-left. Never a full-frame logo animation, never a watermark over the
  entire runtime.
- Real footage first. AI-generated visuals are limited to: abstract
  sports-tech backgrounds, motion graphics/overlays, clean transitions,
  explanatory diagrams, and non-human UI-style visuals. Never an
  AI-generated presenter, athlete, or testimonial.

## Before you call a cut final

Run through `content/scripts/*.md`'s compliance checklists (where present)
and confirm:

- Every claim is something the product actually does today
- The CTA is singular and clear
- Captions pass `content/captions/caption-style-guide.md`
- The frame passes the safe-zone check
- If a price appears, it's accurate and only shown once, appropriately
