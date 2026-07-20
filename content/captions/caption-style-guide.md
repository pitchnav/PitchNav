# Caption style guide

On-screen captions carry the video when sound is off, which is most of the
time on Reels. These rules apply to every video in the system.

## Rules

- **Three to seven words per visual beat.** If it doesn't fit, the beat is
  trying to say two things — split it.
- **High contrast.** White text on the near-black/navy background
  (`#05080f`–`#0d1629`), or a scrim behind text over busy footage.
- **Emphasize the key word in electric blue** (`#2563eb`, or `#3b82f6` for
  slightly more pop over dark video). Emphasize one word or short phrase per
  line, not the whole line.
- **Readable mobile-safe sizing.** Minimum effective size ~7% of frame height
  at 1080×1920 (roughly 130px+ cap height) for primary captions; disclaimers
  and small print no smaller than ~3% of frame height (~55px) and never used
  for anything the viewer needs to act on.
- **Placement outside Instagram UI obstruction zones.** See
  `content/exports/safe-zone-overlay-1080x1920.svg` and its legend — keep
  captions inside the "ideal text region."
- **No large paragraphs.** One idea, one line (occasionally two short lines).
  Never a sentence that wraps three times.
- **No unnecessary punctuation.** Skip periods on short caption lines. Use a
  question mark only when the line is actually a question. No exclamation
  points — the visual pacing carries energy, not punctuation.
- **All caps for caption lines**, sentence case reserved for longer VO-echo
  subtitles if a video uses full burned-in captions (see export presets).

## Typography

Matches the app's existing headline treatment (`src/app/globals.css`,
`.section-heading`): Inter, black/bold weight, tight tracking, uppercase.
There is no separate "condensed" font loaded in the product — condensed
*feel* comes from bold weight + tight letter-spacing + uppercase, not a
different typeface. See `content/captions/caption-tokens.ts` for exact
values.

## Example caption rhythm

```
THIS LOOKS NORMAL

UNTIL FOOT STRIKE

UPPER HALF OPENS EARLY

SAME PATTERN AGAIN

ONE CLEAR PRIORITY

PERSONALIZED DRILLS

TRACK YOUR PROGRESS

START YOUR ANALYSIS
```

Each line is its own visual beat — a new caption should usually coincide
with a cut, zoom, or overlay change, not appear mid-shot.

## Emphasis pattern

Bold the word that carries the new information, in electric blue:

- THIS LOOKS **NORMAL**
- UNTIL **FOOT STRIKE**
- UPPER HALF **OPENS EARLY**
- **SAME PATTERN** AGAIN
- **ONE CLEAR PRIORITY**
- **PERSONALIZED** DRILLS
- TRACK YOUR **PROGRESS**
- **START YOUR ANALYSIS**

## What NOT to do

- Don't caption the CTA in a color other than white/blue (no red/yellow
  urgency colors — that breaks the sports-tech identity)
- Don't stack two captions on screen at once
- Don't use a caption to make a claim the footage doesn't back up
- Don't shrink the disclaimer to the point it's decorative rather than legible
