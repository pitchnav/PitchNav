#!/usr/bin/env node
/**
 * Turns a campaign JSON file into a creative brief markdown file.
 *
 * This script does NOT call any AI model and does not generate video. It
 * assembles the structured campaign data (already written by a human) into
 * the format the video-prompt-builder Claude skill expects as input, and
 * flags which scenes are real footage (never generate) vs. AI-eligible
 * (background/motion-graphic/diagram content the skill can write a Seedance
 * prompt for). See content/scripts/README.md for the full handoff to Claude.
 *
 * Usage:
 *   node content/scripts/generate-video-brief.mjs content/video-campaigns/flagship-understand-your-delivery.campaign.json
 *
 * Output:
 *   content/scripts/generated-examples/<campaignId>-brief.md
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const contentDir = resolve(__dirname, '..')

function fail(message) {
  console.error(`generate-video-brief: ${message}`)
  process.exit(1)
}

const campaignArg = process.argv[2]
if (!campaignArg) {
  fail('Pass a campaign JSON path, e.g. node content/scripts/generate-video-brief.mjs content/video-campaigns/flagship-understand-your-delivery.campaign.json')
}

const campaignPath = resolve(process.cwd(), campaignArg)
if (!existsSync(campaignPath)) {
  fail(`File not found: ${campaignPath}`)
}

const campaign = JSON.parse(readFileSync(campaignPath, 'utf8'))

const requiredFields = ['campaignId', 'campaignName', 'objective', 'audience', 'hook', 'scenes', 'voiceOverScript', 'onScreenText', 'callToAction']
for (const field of requiredFields) {
  if (campaign[field] === undefined) {
    fail(`Campaign JSON is missing required field "${field}". Check it against content/types.ts.`)
  }
}

const hookLibraryPath = join(contentDir, 'video-templates', 'hook-library.json')
const hookLibrary = existsSync(hookLibraryPath) ? JSON.parse(readFileSync(hookLibraryPath, 'utf8')) : { hooks: [] }

function alternateHooks(campaign, count = 3) {
  return hookLibrary.hooks
    .filter((h) => h.category === campaign.hookCategory && h.text !== campaign.hook)
    .slice(0, count)
}

function sceneIsAiEligible(scene) {
  return scene.assetReferences.some((a) => a.aiGenerated === true)
}

function sceneIsRealOnly(scene) {
  return scene.assetReferences.length > 0 && scene.assetReferences.every((a) => a.aiGenerated === false)
}

function renderScene(scene) {
  const aiEligible = sceneIsAiEligible(scene)
  const realOnly = sceneIsRealOnly(scene)
  const flag = aiEligible
    ? '**AI-ELIGIBLE** — background/motion-graphic/diagram content only, feed to the video-prompt-builder skill'
    : realOnly
      ? '**REAL FOOTAGE ONLY** — do not generate, capture or source per the shot list'
      : '**MIXED / NO ASSETS YET** — resolve asset references before generating anything'

  const aiAssets = scene.assetReferences.filter((a) => a.aiGenerated)
  const aiBriefLine = aiAssets.length
    ? `  - One-line creative brief for the skill: "${scene.visualBeat} — ${aiAssets.map((a) => a.description).join('; ')}, matching Pitch Nav's near-black/navy background with electric blue (#2563eb) accents, no readable text baked into the generated element."`
    : ''

  return [
    `### Scene ${scene.id} (${scene.timecode})`,
    `${flag}`,
    `- Visual beat: ${scene.visualBeat}`,
    `- Direction: ${scene.cameraDirection}`,
    scene.onScreenText.length ? `- On-screen text: ${scene.onScreenText.join(' / ')}` : null,
    scene.voiceOver ? `- Voice-over: "${scene.voiceOver}"` : null,
    scene.bRoll.length ? `- B-roll: ${scene.bRoll.join('; ')}` : null,
    scene.soundDesign ? `- Sound: ${scene.soundDesign}` : null,
    aiBriefLine || null,
  ].filter(Boolean).join('\n')
}

const alternates = alternateHooks(campaign)

const brief = `# Creative brief — ${campaign.campaignName}

Generated from \`${campaignArg}\` by \`content/scripts/generate-video-brief.mjs\`.
Do not hand-edit this file — edit the campaign JSON and regenerate.

## Master creative direction

**Objective:** ${campaign.objective}
**Audience:** ${campaign.audience}
**Tone:** Premium sports-tech. Near-black/navy backgrounds, electric blue accents, white condensed headlines, real footage first. Not loud, not childish, not sensational. See \`content/editing-style-rules.md\`.
**Core insight:** ${campaign.coreInsight}
**Open loop → payoff:** ${campaign.openLoop} → ${campaign.payoff}
**Hook:** "${campaign.hook}" (category: ${campaign.hookCategory})
**Duration:** ${campaign.totalDurationSeconds}s
**CTA:** ${campaign.callToAction}${campaign.priceMention ? ` (${campaign.priceMention})` : ''}

## Scene-by-scene direction

${campaign.scenes.map(renderScene).join('\n\n')}

## Editing timeline

${campaign.scenes.map((s) => `- ${s.timecode} — ${s.visualBeat}`).join('\n')}

## Voice-over script

${campaign.voiceOverScript}

## On-screen caption script

${campaign.onScreenText.map((t) => `- ${t}`).join('\n')}

## Sound-effect plan

${campaign.soundDesign}

## B-roll requirements

${campaign.bRollInstructions}

## Transitions

See the technique menu in \`content/video-templates/timelines/_pacing-techniques.md\`. This campaign's per-scene transition notes are captured in each scene's "Direction" line above.

## Export specifications

Platform(s): ${campaign.platform.join(', ')} — see \`content/exports/export-presets.json\` for the matching preset(s) and \`content/exports/export-presets.md\` for the paid-ad-specific timing rules.

## Thumbnail / cover-frame concept

First-frame text: "${campaign.hook}" over the opening visual described in Scene ${campaign.scenes[0]?.id}. Should look like a normal highlight clip until the caption creates doubt or curiosity.

## Alternative hook versions

${alternates.length
    ? alternates.map((h) => `- "${h.text}" (${h.category})`).join('\n')
    : `- No other hooks found in the same category ("${campaign.hookCategory}") in content/video-templates/hook-library.json.`}

---

## Next step

For every scene flagged **AI-ELIGIBLE** above, ask Claude to use the
video-prompt-builder skill with that scene's one-line creative brief as
input, explicitly constrained to: abstract sports-tech backgrounds, motion
graphics, clean transitions, explanatory diagrams, or non-human UI-style
visuals. Never ask it to generate a synthetic athlete, presenter, or
footage that could pass as real. Scenes flagged **REAL FOOTAGE ONLY** are
out of scope for the skill — they come from the shot lists in
\`content/shot-lists/\`.
`

const outDir = join(contentDir, 'scripts', 'generated-examples')
mkdirSync(outDir, { recursive: true })
const outPath = join(outDir, `${campaign.campaignId}-brief.md`)
writeFileSync(outPath, brief, 'utf8')

console.log(`Wrote ${outPath}`)
