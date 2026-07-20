# Export presets

Machine-readable version: `export-presets.json`. This file explains the
"why" behind each setting for editors who don't need the JSON.

## Instagram Reels (organic)

- 1080×1920, 9:16
- H.264 / MP4, high bitrate (don't let Instagram's own compression be the
  first compression pass — start from a clean, high-bitrate export)
- 30 or 60 FPS timeline, matched to whichever source clip has the most
  motion (a 30fps timeline under 60fps slow-motion footage looks choppy)
- Captions burned in — see `content/captions/caption-style-guide.md`
- Must pass the safe-zone check — see `safe-zone-overlay-guide.md`
- Clean audio mix: music under -14 LUFS integrated, ducked at least 8dB
  under any voice-over

## Paid Instagram ads

Same technical spec as organic Reels. What's different is structure, not
codec:

- Primary message must be visible and understandable within the first 2
  seconds (sound off)
- Brand (logo/wordmark) visible early, but never before the hook — don't
  open on a logo animation
- Product (dashboard, report, or drill footage) shown before the halfway
  point of the runtime
- CTA clearly visible at the end, exactly one CTA

## Website video

- Muted, autoplay-friendly cut (no audio required, or a silent track) —
  matches how browsers actually allow autoplay
- Deliver both a compressed MP4 (H.264) and a compressed WebM (VP9) for
  browser coverage
- Captions optional — website placements usually have unmuted-on-click
  behavior, but ship burned-in captions if the placement is hero/background
  video with no click-to-unmute affordance
- Loopable ending — end on a visually calm frame (the CTA end card works
  well) so a loop restart doesn't look like a jump-cut
- Reduced file size is a real requirement, not a nice-to-have — a heavy
  hero video slows the page. Target under 6MB (MP4) / 4MB (WebM) for a 30s
  clip; re-encode if you're over.

## Where these get used

- `content/video-campaigns/*.campaign.json` → `platform` field determines
  which preset(s) apply to a given campaign.
- Run the safe-zone check (`safe-zone-overlay-guide.md`) before any export,
  regardless of preset.
