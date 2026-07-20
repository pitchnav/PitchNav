-- =============================================================
-- Pitch Nav Demo Data
-- CLEARLY MARKED AS FICTIONAL — do not use in production
-- Run after 003_storage_policies.sql
-- =============================================================

-- NOTE: Demo athlete accounts must be created in Supabase Auth first.
-- These inserts assume two demo user UUIDs below. Replace with real
-- UUIDs from your auth.users table if you create actual demo accounts.

-- Demo drill library (safe to insert in any environment)

insert into public.drills (id, name, category, description, what_it_trains,
  athlete_type, sets, reps, coaching_cues, common_mistakes,
  demo_video_url, contraindications, is_active, is_demo)
values

('d1000000-0000-0000-0000-000000000001',
 'Rocker Drill',
 'direction',
 'Stand in your set position and rock toward the plate three times, focusing on keeping your hips square and weight balanced over your pivot foot.',
 'Hip-to-plate direction, early momentum control',
 'All levels',
 3, '10 reps',
 ARRAY['Lead hip drives directly to the plate', 'Keep the glove side closed', 'Stay tall through the rocker'],
 ARRAY['Opening the hips too early', 'Rushing the third rock', 'Leaning toward first base'],
 '',
 'Skip if experiencing hip flexor pain',
 true, true),

('d1000000-0000-0000-0000-000000000002',
 'Knee-to-Knee Drill',
 'lower_half_sequencing',
 'From the set, drive your lead knee directly at the target, pause at balance, then stride and throw. Focus on knee position and hip hinge.',
 'Balance point, lead-leg knee drive, hip load',
 'Youth through high school',
 3, '8 reps',
 ARRAY['Drive the knee, not the foot', 'Load the back hip before the stride', 'Keep the head still at balance'],
 ARRAY['Collapsing at the waist', 'Rushing past balance', 'Short-arming during drill'],
 '',
 null,
 true, true),

('d1000000-0000-0000-0000-000000000003',
 'Pivot Pickoff Drill',
 'lead_leg_stability',
 'From the set, simulate lead-foot contact, freeze in that position for two seconds, then finish the throw. Emphasizes front-leg block and trunk rotation.',
 'Front-leg stability, trunk rotation timing',
 'High school through college',
 3, '6 reps',
 ARRAY['Land on a firm front leg', 'Drive the back hip through after contact', 'Keep your head level through release'],
 ARRAY['Collapsing the front knee', 'Stopping the arm at freeze', 'Locking out the front knee completely'],
 '',
 null,
 true, true),

('d1000000-0000-0000-0000-000000000004',
 'Wall Wrist Snap',
 'arm_timing',
 'Stand 12 inches from a wall. With your elbow at shoulder height and your hand in power position, snap the wrist and let your fingers graze the wall. Builds feel for proper release.',
 'Wrist snap, release point, finger pressure',
 'All levels',
 3, '15 reps',
 ARRAY['Lead with the fingers, not the palm', 'Keep the elbow up at shoulder height', 'Feel the seams roll off your index and middle finger'],
 ARRAY['Pushing the ball instead of snapping', 'Elbow dropping below the shoulder', 'Using too much arm instead of wrist/fingers'],
 '',
 'Avoid if experiencing elbow ulnar pain',
 true, true),

('d1000000-0000-0000-0000-000000000005',
 'Standing Decel Towel Drill',
 'deceleration',
 'Hold a small rolled towel in your throwing hand. Make a full throw motion, and as you follow through, focus on decelerating the arm across your body and finishing with your hand near your opposite hip.',
 'Follow-through path, deceleration muscles, arm care',
 'All levels',
 3, '10 reps',
 ARRAY['Let the arm swing all the way across the body', 'Finish with your palm facing down', 'Resist the urge to "stop" the arm early'],
 ARRAY['Cutting the follow-through short', 'Elbow flaring out at finish', 'Not engaging the abdominals through deceleration'],
 '',
 null,
 true, true),

('d1000000-0000-0000-0000-000000000006',
 'Target Box Command Drill',
 'command',
 'Set up a 6×6 inch square on the wall using tape. From 45 feet, aim for each quadrant of the box on a rotation. Track hit percentage per session.',
 'Focus, release consistency, command development',
 'High school through adult',
 4, '20 pitches per session',
 ARRAY['Pick a specific spot inside the box before each pitch', 'Commit to the target', 'Log your hit percentage each session'],
 ARRAY['Looking at the box too late in the windup', 'Changing grips mid-session', 'Ignoring misses instead of diagnosing them'],
 '',
 null,
 true, true);
