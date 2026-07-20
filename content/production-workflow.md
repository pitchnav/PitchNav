# Production workflow

The 17-step process for turning an idea into a published, tracked video.
Every step links to the file/folder that supports it.

1. **Select the video objective.** Pick from the 10 content types in
   `content/types.ts` (`ContentType`) — organic Reel, paid ad, product
   explanation, case study, etc.
2. **Choose a script template.** Match the objective to a format in
   `content/video-templates/formats/` (A through G).
3. **Generate five hooks.** Pull from `content/video-templates/hook-library.json`,
   or write new ones following the same rules (works silently, resolves
   what it promises).
4. **Select the core footage.** Check what's real and available first —
   see `content/shot-lists/` — before planning anything AI-generated.
5. **Create a scene timeline.** Copy `content/video-campaigns/_TEMPLATE.campaign.json`,
   pick a duration from `content/video-templates/timelines/`, and fill in
   the `scenes` array.
6. **Generate or locate supporting assets.** Use
   `content/scripts/generate-video-brief.mjs` to turn the campaign JSON into
   a creative brief, then use the video-prompt-builder skill for any
   AI-generated backgrounds/motion graphics/diagrams (see
   `content/scripts/README.md`).
7. **Record voice-over.** Use the `voiceOverScript` field from the campaign
   JSON as the read script.
8. **Assemble rough cut.** Real footage first, matched to the timecodes in
   the campaign's `scenes` array.
9. **Add captions.** Follow `content/captions/caption-style-guide.md` and
   the campaign's `onScreenText` array.
10. **Add overlays.** Joint-marker/angle-overlay motion graphics per the
    scene's `assetReferences`.
11. **Add sound design.** Follow the campaign's `soundDesign` field and the
    general rules in `content/editing-style-rules.md`.
12. **Review factual claims.** Run the compliance checklist in
    `content/editing-style-rules.md` — no guaranteed outcomes, no fake
    numbers, estimates labeled as estimates.
13. **Check mobile safe zones.** Use `content/exports/safe-zone-overlay-1080x1920.svg`
    per `content/exports/safe-zone-overlay-guide.md`.
14. **Export.** Use the matching preset in `content/exports/export-presets.md`.
15. **Publish.** Post per the platform(s) listed in the campaign's
    `platform` field; use the social caption/hashtags from the companion
    script file in `content/scripts/` if one exists.
16. **Log performance.** Add a row to `content/performance-data/performance-tracker.csv`
    with the same `hookVariant`/`testVariation` id as the campaign, and set
    the campaign JSON's `status` to `"published"`.
17. **Create the next iteration.** Use `content/performance-data/dashboard.html`
    and `content/performance-data/ad-testing-strategy.md` to decide what the
    next hook, format, or length should be — based on data, not guesswork.
