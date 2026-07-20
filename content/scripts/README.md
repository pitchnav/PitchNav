# Video prompt generator

Turns a campaign JSON (`content/video-campaigns/*.campaign.json`) into a full
creative brief, and tells you exactly which scenes are real footage (never
generate) versus AI-eligible (safe to run through the video-prompt-builder
skill). See `content/production-workflow.md` step 6 for where this fits in
the overall process.

## Step 1 — write or copy a campaign JSON

Start from `content/video-campaigns/_TEMPLATE.campaign.json` or one of the
five launch ads. Fill in every field — the generator will refuse to run if
required fields are missing. If you're starting from scratch instead of a
campaign, answer the questions in `video-prompt-generator-input-schema.ts`
first and use them to fill out the template.

## Step 2 — run the generator

```
node content/scripts/generate-video-brief.mjs content/video-campaigns/<your-campaign>.campaign.json
```

This writes `content/scripts/generated-examples/<campaignId>-brief.md`
containing:

- Master creative direction
- Scene-by-scene direction, each scene marked **REAL FOOTAGE ONLY** or
  **AI-ELIGIBLE**
- The full editing timeline
- Voice-over script
- On-screen caption script
- Sound-effect plan
- B-roll requirements
- Transitions (pointer to the pacing-technique menu)
- Export specifications (pointer to the matching preset)
- Thumbnail / cover-frame concept
- Alternative hook versions (pulled from `hook-library.json`, same category,
  excluding the one you used)

Two worked examples already exist so you can see the output without running
anything: `generated-examples/flagship-understand-your-delivery-brief.md`
and `generated-examples/launch-ad-01-mechanical-problem-brief.md`.

## Step 3 — hand AI-eligible scenes to the video-prompt-builder skill

For every scene the brief marks **AI-ELIGIBLE**, it already includes a
one-line creative brief for that scene. In a Claude Code chat, ask Claude to
use the `video-prompt-builder` skill with that line, and add these two
constraints on top of it any time the asset will be composited over real
footage (which is the normal case in this system):

1. No human figure, no athlete likeness, no face — background, motion
   graphic, or diagram content only.
2. Designed to be composited via an additive/screen blend at reduced
   opacity over real footage, not viewed as a standalone clip.

See `generated-examples/flagship-scene-prompts.md` for a complete worked
example of a skill output, including the post-production compositing notes
an editor needs to actually use it.

**Never** run a scene marked **REAL FOOTAGE ONLY** through the skill. Those
scenes come from `content/shot-lists/` — go shoot or screen-record them.

## Do not generate fake athletes

If real footage exists or can be captured, use it. AI generation in this
system is limited to: abstract sports-tech backgrounds, motion graphics,
clean visual transitions, explanatory diagrams, and non-human UI-style
visuals — never a synthesized pitcher, coach, founder, or testimonial. This
matches `content/editing-style-rules.md`.

## Adding real footage to a campaign

Once footage is captured (see `content/shot-lists/`), update the relevant
scene's `assetReferences` in the campaign JSON: set `status` to
`"available"` and fill in `path` with where the file actually lives (repo
path or shared-drive path). Re-run the generator if you want an updated
brief reflecting the real asset paths.
