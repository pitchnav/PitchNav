# Flagship ad — AI-generated scene prompt (worked example)

This is the fully worked example for deliverable #2 (video prompt
generator). It picks up exactly where `flagship-understand-your-delivery-brief.md`
leaves off: that file flagged **Scene scene-3 (0:05–0:11)** as
**AI-ELIGIBLE**, with this one-line creative brief generated automatically:

> "Freeze at the key phase, reveal the pattern — Blue overlay highlighting
> the rotation-vs-stability pattern, matching Pitch Nav's near-black/navy
> background with electric blue (#2563eb) accents, no readable text baked
> into the generated element."

Everything else in the flagship ad (both pitching reps, the dashboard screen
recording, the end card) is real footage and is explicitly **out of scope**
for the video-prompt-builder skill — see the shot lists instead.

## What was asked of the skill

The skill (`video-prompt-builder`, targeting Seedance 2.0) was given this
brief, with two hard constraints added on top of the one-line brief above,
because this asset gets composited over a real athlete's freeze frame in the
edit — it is not a standalone video and must never contain a synthesized
person:

- No human figure, no athlete likeness, no face — line/marker graphics only
- Designed to be composited via an additive/screen blend at reduced opacity
  over the real freeze-frame footage, so edges should glow rather than have
  hard silhouette fills

Target duration: ~3.5 seconds (matches the overlay-animation portion of the
6-second scene; the freeze frame itself is real footage already in hand).

## Skill output

### SHOT-BY-SHOT EFFECTS TIMELINE

SHOT 1 (00:00-00:01) — Marker Draw-On
• EFFECT: Line draw-on (vector reveal) + soft bloom pulse
• Two glowing electric-blue (#2563eb) line markers animate onto a dark
  navy/near-black (#05080f) background, tracing simplified joint-line paths
  — one across the shoulder line, one across the hip line — with a thin
  animated stroke, as if drawn at high speed
• No camera movement — static frame, built for compositing, not for
  standalone viewing
• Draw-on speed: fast, approximately 0.4 seconds per line, lines draw in
  sequence (shoulder line first, then hip line)
• Exits by holding both completed lines at full brightness into Shot 2

SHOT 2 (00:01-00:02.5) — Rotation Delta Indicator
• EFFECT: Angular arc fill (sweep-in) + secondary glow pulse
• A thin arc sweeps between the two marker lines, indicating the angular gap
  between them, filling in with an electric-blue gradient as it sweeps
  clockwise
• The hip-line marker pulses once, slightly brighter, functioning as the
  "stable reference point" the arc is measured against
• This is the SIGNATURE VISUAL EFFECT of the asset — the arc-fill
  communicates "a gap exists" purely through motion and glow, with no
  numbers or text baked in (captions are added separately in the edit)
• Static frame, no camera movement, no zoom

SHOT 3 (00:02.5-00:03.5) — Hold and Decay for Composite
• EFFECT: Opacity hold + edge-glow decay
• Both lines and the arc hold at full brightness for approximately 0.5
  seconds, then the edge glow softens by roughly 30% so the graphic reads
  clearly once the editor composites it at reduced opacity over the real
  freeze-frame footage
• Exits on a clean, static final frame — no transition baked in; the cut to
  Scene 4 (real footage, second rep) happens in the edit, not in this asset

### MASTER EFFECTS INVENTORY

1. LINE DRAW-ON (used 2x) — Shot 1 — primary reveal technique, establishes
   both reference lines
2. ANGULAR ARC FILL (used 1x) — Shot 2 — the signature effect; the only
   moment that visually communicates the mechanical pattern
3. GLOW PULSE (used 2x) — Shots 1, 2 — draws the eye to each marker as it
   becomes relevant
4. EDGE-GLOW DECAY (used 1x) — Shot 3 — prepares the asset for a clean
   composite over real footage

### EFFECTS DENSITY MAP

00:00-00:01 = MEDIUM DENSITY (line draw-on, bloom pulse — 2 effects in 1s)
00:01-00:02.5 = HIGH DENSITY (arc fill, glow pulse — 2 effects in 1.5s — signature moment)
00:02.5-00:03.5 = LOW DENSITY (hold, edge decay — 1 effect in 1s)

### ENERGY ARC

- **Act 1 (0–1s):** Reveal — the two reference lines draw on quickly,
  establishing what the viewer is looking at
- **Act 2 (1–2.5s):** Signature moment — the arc fill is the single most
  important beat of this asset; it's the visual translation of "the upper
  half is already rotating before the front side is stable"
- **Act 3 (2.5–3.5s):** Settle — glow decays to composite-ready brightness
  and holds, handing off cleanly to the real second-rep footage that follows

## Post-production compositing instructions

- Blend mode: Screen or Add, opacity 70-85% over the real freeze-frame plate
- Align the shoulder-line and hip-line markers by hand to the athlete's
  actual joint positions in the freeze frame — the generated asset is
  intentionally generic/schematic and needs manual alignment per athlete
- Do not scale or distort the athlete footage to fit the graphic; move and
  scale the graphic to fit the athlete
- If the composite reads as cluttered against a busy background, add a
  subtle scrim (per `content/captions/caption-tokens.ts` → `captionColors.scrim`)
  behind the graphic only, not across the full frame

## How this generalizes

Any scene flagged **AI-ELIGIBLE** by `generate-video-brief.mjs` follows this
same pattern: take the one-line creative brief the script produced, add the
"no human figure / composite-ready" constraints if the asset will sit over
real footage, then ask Claude to run the video-prompt-builder skill on it.
Scenes flagged **REAL FOOTAGE ONLY** never go through this process.
