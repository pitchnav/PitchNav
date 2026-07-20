# Pitch Nav video content system

This folder is a self-contained system for planning, scripting, and tracking
Pitch Nav's short-form video advertising — Instagram Reels, Collab Reels,
paid ads, website video, and everything else in
`content/types.ts` → `ContentType`. It's written for an editor with strong
editing skills but limited programming experience. You don't need to write
code to use almost all of it — a few pieces use JSON (structured text files)
and one small script, both explained below in plain language.

If you only read one other file, read `content/production-workflow.md` —
it's the 17-step process every video goes through, with a link to the exact
file that supports each step.

## Folder map

```
content/
  README.md                        ← you are here
  types.ts                         ← the "rulebook" every campaign JSON follows
  editing-style-rules.md           ← pacing, tone, and compliance rules for every video
  production-workflow.md           ← the 17-step process, start to finish

  video-campaigns/                 ← one JSON file per video (the "script + shot list" in one place)
  video-templates/
    hook-library.json              ← 90 reusable opening lines, 6 categories, 15 each
    timelines/                     ← pacing templates for 10s/15s/20s/30s/45s/60s videos
    formats/                       ← 7 reusable script structures (A-G)

  scripts/                         ← the 5 launch ads + flagship ad, written out in full
    generate-video-brief.mjs       ← the one script in this system (see below)
    generated-examples/            ← real output from that script, already run for you

  shot-lists/                      ← printable/phone-friendly checklists for shoot days
  captions/                        ← on-screen caption rules + reusable style values
  exports/                         ← export settings + the safe-zone overlay graphic
  performance-data/                ← performance tracker (spreadsheet) + a viewer for it
```

## What to do first, depending on your role

**"I need to shoot something today."**
Open `content/shot-lists/master-shoot-day-checklist.md`, then the specific
checklist (founder / pitching / screen recording) it points you to.

**"I need to write or find a video script."**
Look in `content/scripts/` first — the five launch ads and the flagship ad
are already fully written, with exact timecodes, voice-over, captions,
hashtags, and a social caption. If you need something new, pick a format
from `content/video-templates/formats/` and a hook from
`content/video-templates/hook-library.json`.

**"I need to edit a video that's already scripted."**
Open the matching file in `content/video-campaigns/*.campaign.json` for the
scene-by-scene breakdown, `content/captions/caption-style-guide.md` for how
to caption it, `content/exports/safe-zone-overlay-guide.md` before you
place any text, and `content/exports/export-presets.md` when you export.

**"I need to log how a video performed."**
Add a row to `content/performance-data/performance-tracker.csv` (it's a
spreadsheet — open it in Excel/Numbers/Google Sheets, or a text editor).
Then open `content/performance-data/dashboard.html` in a browser to see it
summarized. See "The one script in this system" below for the one thing to
know about `.csv` vs `.json` files.

**"I need to generate an AI video-generation prompt for a background or
overlay graphic."**
Read `content/scripts/README.md`. Short version: only AI-generate
backgrounds/graphics/diagrams, never people or footage that could pass as
real, and there's already one worked example to copy the pattern from.

## The campaign JSON format, in plain language

Every video in `content/video-campaigns/` is one `.json` file. JSON is just
structured text — it looks like this:

```json
{
  "campaignName": "Launch Ad 1 — Mechanical Problem Hook",
  "hook": "This looks normal until you freeze this frame.",
  "totalDurationSeconds": 30
}
```

You can open and edit these in any text editor (VS Code, TextEdit,
Notepad). The rules for what fields exist and what they mean live in
`content/types.ts` — you don't need to read that file to fill in a
campaign, but if you're ever unsure what a field is for, that's the answer
key. To start a new one, copy `content/video-campaigns/_TEMPLATE.campaign.json`
and fill in every field.

**The one thing that will break things:** JSON is picky about commas and
quotation marks. If you edit one of these files by hand, keep the same
punctuation pattern as the lines around what you're changing. See
"Validating your changes" below for how to check you didn't break anything
— it takes one command and tells you exactly what's wrong if something is.

## The one script in this system

`content/scripts/generate-video-brief.mjs` reads a campaign JSON and writes
out a full creative brief (voice-over, captions, sound plan, export specs,
alternative hooks, etc. all assembled in one place). You do not need to run
it to use the system — every campaign already has everything it needs
written directly in its JSON and in its companion script file in
`content/scripts/`. Run it only if you want a single combined document, or
if you're prepping a scene for AI-generated background/graphic work (see
`content/scripts/README.md`).

To run it, open Terminal, go to the project folder, and run:

```
node content/scripts/generate-video-brief.mjs content/video-campaigns/flagship-understand-your-delivery.campaign.json
```

That's it — no installation needed, it uses Node.js which is already set up
for this project. It writes a new file into
`content/scripts/generated-examples/`.

## Instructions for adding real user/footage assets

1. Shoot or record the footage using the relevant checklist in
   `content/shot-lists/`.
2. Store the file wherever the team keeps raw footage (this repo is not
   meant to store large video files).
3. Open the campaign JSON the footage belongs to, find the matching item in
   its `assetReferences` list (or a scene's `assetReferences`), and:
   - change `"status": "needed"` to `"status": "available"`
   - fill in `"path"` with where the file actually lives
4. Leave `"aiGenerated": false` — that field exists specifically so nobody
   ever mistakes real footage for generated content, or vice versa.

## Instructions for generating scene prompts (AI-generated visuals only)

See `content/scripts/README.md` for the full walkthrough. Short version:
run the generator script, look for scenes marked **AI-ELIGIBLE** in the
output, and ask Claude to use the video-prompt-builder skill on that
scene's one-line brief. Never do this for a scene marked **REAL FOOTAGE
ONLY**.

## Instructions for testing ad variations

Follow `content/performance-data/ad-testing-strategy.md` exactly — it's a
9-step process (publish organic → wait → compare → pick a winner → small
paid test → log results → iterate). Don't skip to paid spend before the
organic comparison step. The dashboard
(`content/performance-data/dashboard.html`) ships with example data so you
can see what a comparison looks like before you have real numbers — replace
it by editing `performance-tracker.csv`.

## Validating your changes

If you've edited any `.json` or `.ts` file in this folder and want to check
you didn't break the formatting, run this from the project's main folder in
Terminal:

```
npm run type-check
```

If everything is fine, it finishes with no output. If something's wrong, it
tells you the exact file and line. This is the same command used to check
the rest of the Pitch Nav website, so it's safe to run any time.

## The rules that apply to everything

- `content/editing-style-rules.md` — pacing, tone, and the compliance rules
  (no guaranteed velocity claims, no medical claims, no fake numbers, etc.)
- Brand: near-black/navy backgrounds, electric blue accents, white
  condensed-style headlines, minimal logo use, real footage first — see
  `content/captions/caption-tokens.ts` for the exact values, pulled directly
  from the live website's own styles.
- Every paid ad has exactly one CTA: "Start your Pitch Nav analysis."
- The price ($25/month) appears only when the format calls for it — never
  forced into every video.
