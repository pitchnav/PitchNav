# Launch Reel 5 — AI generation prompts (front-leg/hip stability overlays)

For `content/video-campaigns/launch-reel-05-before-after.campaign.json`. Two
prompts, used across three overlay moments — everything else in this Reel is
real footage of a real, consenting athlete's two clips and a real screen
recording.

**Composite target for both:** electric-blue (#2563eb) line-marker graphics
on a transparent-friendly dark background, meant to be blended (Screen/Add,
~70-85% opacity) over real freeze-frame footage. **No human figure, no
athlete likeness, no face, no readable text baked in.**

## Prompt A — Stability marker (Scene scene-3, 0:05–0:09)

Used identically on **both** halves of the split screen — generate once,
composite twice (left = week 0, right = week 6). Target duration: ~4 seconds.

Paste everything below into the AI video tool as one prompt:

---

SHOT 1 (00:00-00:01) — Hip-Line Marker Draw-On
• EFFECT: Line draw-on (vector reveal) + soft bloom pulse
• A glowing electric-blue (#2563eb) line draws onto a dark navy/near-black
  (#05080f) background, tracing a simplified hip-line marker
• Static frame, no camera movement
• Draw-on speed: approximately 0.4 seconds

SHOT 2 (00:01-00:02) — Front-Leg Marker Draw-On
• EFFECT: Second line draw-on
• A second glowing blue line draws on, connecting from the hip marker down
  to a front-knee/ankle point, tracing the front leg's stability line
• Static frame, no camera movement

SHOT 3 (00:02-00:03) — Stability Indicator Pulse
• EFFECT: Glow pulse + subtle tick marks along the leg line
• Small vertical tick marks appear along the front-leg line and pulse once,
  suggesting "measuring stability" with no numbers or text
• This is the SIGNATURE VISUAL EFFECT of this asset
• Static frame

SHOT 4 (00:03-00:04) — Hold and Decay for Composite
• EFFECT: Opacity hold + edge-glow decay
• Hold at full brightness for approximately 0.5 seconds, then edge glow
  softens by roughly 30% for a clean composite
• Static final frame, no transition baked in

MASTER EFFECTS INVENTORY

1. LINE DRAW-ON (used 2x) — Shots 1, 2
2. GLOW PULSE + TICK MARKS (used 1x) — Shot 3 — signature effect
3. EDGE-GLOW DECAY (used 1x) — Shot 4

EFFECTS DENSITY MAP

00:00-00:02 = MEDIUM DENSITY (two line draw-ons — 2 effects in 2s)
00:02-00:03 = HIGH DENSITY (pulse + tick marks — 2 effects in 1s — signature moment)
00:03-00:04 = LOW DENSITY (hold, decay — 1 effect in 1s)

ENERGY ARC

- Act 1 (0–2s): Reveal — hip and leg lines draw on in sequence
- Act 2 (2–3s): Signature moment — tick marks pulse to suggest a stability
  measurement
- Act 3 (3–4s): Settle — decays to composite brightness, holds for the
  freeze frame

---

## Prompt B — Stability delta / "locked in" bloom (Scene scene-5, 0:14–0:18)

Used once, composited only on the **"after" (week 6) side** of the split
screen, over Prompt A's marker already in place, to visually communicate
the improvement. Target duration: ~3 seconds.

Paste everything below into the AI video tool as one prompt:

---

SHOT 1 (00:00-00:01) — Baseline Marker Hold
• EFFECT: Static line hold + subtle brightness dip
• A hip-line and front-leg marker in the same style as Prompt A sit at
  reduced brightness, establishing the baseline
• Static frame, no camera movement

SHOT 2 (00:01-00:02) — Stability Delta Bloom
• EFFECT: Directional glow bloom (upward sweep) + brightness ramp
• A soft electric-blue glow bloom sweeps upward along the front-leg line
  from ankle to hip, ramping the line to full brightness as it passes
• This is the SIGNATURE VISUAL EFFECT — the upward bloom is the entire
  message of the asset: stability achieved
• Static frame, no camera movement, no zoom

SHOT 3 (00:02-00:03) — Hold and Decay for Composite
• EFFECT: Opacity hold + edge-glow decay
• Hold at full, locked-in brightness for approximately 0.5 seconds, then
  edge glow softens by roughly 30% for a clean composite
• Static final frame, no transition baked in

MASTER EFFECTS INVENTORY

1. STATIC LINE HOLD (used 1x) — Shot 1
2. DIRECTIONAL GLOW BLOOM (used 1x) — Shot 2 — signature effect
3. EDGE-GLOW DECAY (used 1x) — Shot 3

EFFECTS DENSITY MAP

00:00-00:01 = LOW DENSITY (static hold — 1 effect in 1s)
00:01-00:02 = HIGH DENSITY (bloom sweep, brightness ramp — 2 effects in 1s — signature moment)
00:02-00:03 = LOW DENSITY (hold, decay — 1 effect in 1s)

ENERGY ARC

- Act 1 (0–1s): Baseline — the marker sits quietly, matching the "before"
  side
- Act 2 (1–2s): Signature moment — the upward glow bloom communicates
  "locked in," the visual translation of "more stable at release"
- Act 3 (2–3s): Settle — holds at composite-ready brightness

---

## Compositing instructions

- Blend mode: Screen or Add, opacity 70-85% over the real freeze-frame plates
- Align both markers by hand to each side's actual joint positions — same
  generic graphic, different real footage underneath on each side
- Prompt B renders only on the "after" half; the "before" half keeps Prompt
  A alone, unbloomed, so the contrast reads honestly
