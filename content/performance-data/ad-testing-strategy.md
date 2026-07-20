# Ad testing strategy

The workflow below is the only sanctioned way to move a launch-ad hook from
"idea" to "paid spend." It exists to stop budget from being spent on a guess.

## The workflow

1. **Publish five organic variations.** Post all five launch-ad hooks
   (`content/scripts/launch-ad-01.md` through `05.md`, organic-variation
   cuts — no price on the end card) as separate organic Reels, close
   together in time so external conditions (day of week, algorithm mood)
   are roughly comparable.
2. **Wait for sufficient initial data.** Don't judge before ~48-72 hours;
   Reels reach compounds over the first few days.
3. **Compare first-second retention, average watch time, shares, saves, and
   clicks** — not just reach or like count. Use
   `content/performance-data/dashboard.html` or the raw
   `performance-tracker.csv` to line the five up side by side.
4. **Select the strongest post.** "Strongest" means the best combination of
   hook retention (three-second views / reach) and downstream engagement
   (saves, shares, comments, clicks) — a video with huge reach but no saves
   or clicks is not automatically the winner. See the worked example below.
5. **Use no more than a $10 total paid test.** This is a signal check, not a
   scale-up. $10 is enough to see whether paid distribution behaves like
   organic did, not enough to draw a definitive ROAS conclusion.
6. **Run the winning creative** rather than a brand-new, untested ad. The
   whole point of steps 1-4 was to de-risk the creative before spending on
   it.
7. **Optimize the ad set for website visits or subscriptions, not likes or
   reach.** Likes are a vanity signal at this budget; conversion events are
   the only thing worth optimizing toward.
8. **Record results in the dashboard.** Add a new row to
   `performance-tracker.csv` for the paid test, tagged with the same
   `hookVariant` id as its organic sibling so they're comparable.
9. **Produce the next iteration based on the data** — either a new hook
   variant informed by what worked, or a longer/shorter cut of the winner
   for a different placement.

## Worked example (using the seeded example data)

`performance-tracker.csv` ships with six example rows: the five organic
launch-ad tests plus one paid test, clearly marked `[EXAMPLE]`. **Replace
these with real numbers as soon as you have them** — they exist only to
prove the dashboard and formulas work end to end.

In the example data, Launch Ad 5 (Founder Credibility) has the *lowest* raw
reach of the five (3,100) but the *highest* hook retention rate (0.84),
completion rate (0.46), saves, and comments. Judged on reach alone it would
look like the weakest post; judged on the actual signals that matter
(step 3), it's the strongest. The example paid-test row shows it being run
with a $10 spend, which is what step 5-6 describe.

## What NOT to do

- Don't automatically recommend increasing the ad budget after one $10 test
  — one test is a signal, not proof. A second small test on a different
  audience or placement is a more defensible next step than scaling spend.
- Don't launch a sixth, unlaunched hook idea as the "paid test" — the paid
  budget is reserved for the organically-validated winner.
- Don't optimize toward or report on likes as if they were the success
  metric.
