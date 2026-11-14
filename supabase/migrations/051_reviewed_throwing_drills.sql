-- Named throwing drills available to the assessment and training-plan specialists.
-- The scheduled catch session supplies the throwing volume. Both rows intentionally
-- leave sets and reps unset. Preserve any existing staff record and activation choice.
-- Figure 8: https://treadathletics.com/wp-content/uploads/2020/12/Late-Arm-Drill-Progression-PDF.pdf
-- Janitor setup: https://www.drivelinebaseball.com/wp-content/uploads/2022/09/PITCHING-PDF-FINAL.pdf#page=12
-- Rear-hip emphasis: https://www.802baseballlab.com/blog/rt90/assessment
with seed(id, name, category, description, trains, cues, mistakes) as (
  values
    ('d5100000-0000-4000-8000-000000000001', 'Figure 8 Rhythm Rocker', 'arm_timing',
     'Stand side-on to a partner in a comfortable stride stance with a regular baseball. Rock onto the back foot as your throwing hand traces a loose figure eight. Carry the last loop into the forward rock and throw to your partner in one continuous motion.',
     'Rhythm from hand separation into landing when the throwing hand stalls low or the forearm rises late.',
     array['Let the last loop flow straight into the throw.'],
     array['Stopping at the bottom of the loop', 'Holding the arm in an L before throwing']),
    ('d5100000-0000-4000-8000-000000000002', 'Janitor Throws', 'lower_half_sequencing',
     'For the rear-hip hinge variation, start with your back facing the target and your throwing-side foot at the rubber. Soften the back knee and sit the back hip slightly behind you. Lift the front foot just clear, then stride out of that load and throw a regular baseball to your partner.',
     'Feeling the rear-hip hinge during the move out of the back leg when the review identifies a shallow or lost hinge.',
     array['Feel your back pocket move behind you, then carry that load into the stride.'],
     array['Dropping straight down into a squat', 'Standing up out of the hinge before the stride starts'])
)
insert into public.drills
  (id, name, category, description, what_it_trains, coaching_cues, common_mistakes, contraindications, is_active, is_demo)
select id::uuid, name, category::public.drill_category, description, trains, cues, mistakes,
       'Use easy throws already scheduled in catch. Follow the throwing limits in your program.', true, false
from seed
where not exists (select 1 from public.drills d where lower(trim(d.name)) = lower(seed.name))
on conflict (id) do nothing;
