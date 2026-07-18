-- Pitch Nav's two monthly membership options.
-- The paid order amount determines whether strength/mobility programming is included.

insert into public.admin_settings (key, value, description)
values
  ('throwing_membership_price_cents', '2500', '$25 monthly throwing-development membership'),
  ('performance_membership_price_cents', '4000', '$40 monthly membership including strength and mobility'),
  ('membership_price_cents', '2500', 'Starting monthly Pitch Nav membership price in cents')
on conflict (key) do update
set value = excluded.value,
    description = excluded.description;
