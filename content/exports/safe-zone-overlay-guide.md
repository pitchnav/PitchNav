# Safe-zone overlay guide

File: `safe-zone-overlay-1080x1920.svg` — 1080×1920, transparent background,
diagnostic colors (red = unsafe/obstructed, green = ideal text region, blue =
ideal logo/CTA marker). These colors are for the editing guide only and never
appear in the finished video.

## Why these numbers

Instagram doesn't publish exact safe-zone pixel values, and the UI shifts
over time (new icons, redesigns). The zones below are the widely-used editor
convention for 1080×1920 Reels/ads and are close enough to work reliably —
but **spot-check against the current Instagram app before a big campaign**,
since Meta does redesign the overlay UI periodically.

| Zone | Pixels (1080×1920) | Why |
|---|---|---|
| Top obstruction | y: 0–250 | Recording controls when viewed in-app; story-bar overlap if cross-posted |
| Right-side engagement rail | x: 900–1080, y: 950–1710 | Like / comment / share / save / audio-disc icons |
| Bottom IG UI zone | y: 1620–1920 | Username, native caption text, audio title, "..." more |
| Ideal text region | x: 60–900, y: 270–1600 | Everything outside the three unsafe zones above, with a margin |
| Ideal logo position | x: 60–360, y: 90–220 | Top-left, small, out of the way of both obstruction zones |
| Ideal CTA position | x: 140–940, y: 1420–1600 | Centered, low enough to read as an ending, still above the IG UI zone |

## How to use it while editing

1. Import `safe-zone-overlay-1080x1920.svg` onto its own guide track above
   your edit, at 100% timeline width, locked so it doesn't get trimmed by
   accident.
2. Set its blend mode to Normal and keep it visible while placing captions,
   the logo, and the CTA card.
3. Keep primary captions and the CTA inside the green "ideal text region."
   Never place essential text inside a red zone.
4. Toggle the guide track off (don't delete it until final export, in case
   you need to re-check a change) and confirm the export preview with the
   guide hidden.
5. Do not render or export with the guide track visible — it is a working
   aid only, never part of the delivered video. See
   `content/exports/export-presets.md` for the "safe-zone compliant" export
   requirement.

## Paid ads vs. organic

The spatial zones are identical for organic Reels and paid ads — the
difference is timing, not layout. See `content/video-templates/formats/format-g-paid-ad.md`
for the paid-specific rule that the primary message must read within the
first 2 seconds regardless of where it sits in the safe zone.
