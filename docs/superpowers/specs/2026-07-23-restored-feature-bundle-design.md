# Restored Feature Bundle Design

## Goal

Ship the restored Pitch Nav feature work as one release. The release improves athlete feedback, creates a fixed eight-week development plan, adds two-week reassessments, improves video navigation, and refines the camera and skeleton visuals.

The training calendar starts when staff publishes the report. Athletes receive the full eight weeks because unpublished plans remain inaccessible.

## Existing Feature Bundle

The restored files already implement these product changes:

- The AI coaching route requests detailed, plain-language feedback and rebuilds each athlete's throwing plan from the staff-reviewed mechanics categories.
- The throwing plan covers eight weeks and schedules video reassessments at weeks 2, 4, 6, and 8.
- The performance plan schedules matching workload reviews and stops after week 8.
- The athlete report shows the coach narrative, strengths, priorities, phase-specific observations, and coaching cues.
- The calendar stops after the eighth week instead of looping back to week 1.
- Dashboard video-review links open the video attached to the published analysis.
- Motion Lab loads the athlete's latest open-side submission when no video ID appears in the URL.
- Camera guidance and rendered skeletons use clearer side-view anatomy and mound references.

## Publication-Day Schedule

The publish-report route will set three plan fields in the same update:

- `published_at`: the release timestamp.
- `starts_on`: the publication date.
- `follow_up_date`: 56 calendar days after publication.

The report page will continue to use `starts_on` as the calendar anchor. Re-publishing an already published report must not restart the athlete's plan. The route will retain the original schedule when the analysis and report were already published.

## Plan Generation

`buildEightWeekThrowingPlan` remains the single throwing-plan generator for both the browser submission flow and the staff AI-review flow. It will:

- return exactly eight ordered weeks;
- mark weeks 2, 4, 6, and 8 as reassessments;
- use the clearest low-scoring mechanics category as the primary focus;
- keep low-confidence observations from outranking clearer evidence;
- tell the athlete that week 8 ends the block and requires a new season-based program.

The existing performance-plan generator will keep its eight-week structure and matching reassessment language.

## Calendar Behavior

The athlete calendar will expose today plus the next 13 days. It will select plan weeks without modulo arithmetic. Dates after the eighth week will show a completed-program message and will not repeat week 1 exercises.

## Error Handling and Safety

- Staff remains responsible for verifying all AI-generated coaching language before publication.
- The feature will retain the existing medical, injury-risk, velocity, and confidence disclaimers.
- Plan-generation failures will continue to return an error to staff instead of publishing incomplete plan data.
- Athlete report queries will continue to require the owner, `published` status, and a non-null publication timestamp.
- No migration or production environment-variable change is required.

## Tests

Focused automated tests will cover:

- eight throwing-plan weeks in the correct order;
- reassessment flags at weeks 2, 4, 6, and 8;
- confidence-aware category ranking;
- week-8 stop and season-reprogramming language;
- publication-day `starts_on`;
- a follow-up date exactly 56 days later;
- no schedule reset when staff re-publishes an already published report.

The release gate also includes TypeScript, lint, the complete production build with safe placeholder environment values, diff checks, and a final authorization review.

## Release

The restored feature files and their focused fixes will ship in one commit after all checks pass. The normal `main` push will trigger the production Vercel deployment. No Supabase migration is part of this release.
