begin;
alter table public.athlete_profiles
  add column if not exists consent_ai_draft boolean not null default false;

create or replace function public.athlete_intake_eligible(p public.athlete_profiles)
returns boolean language sql stable set search_path = '' as $$
  select p.terms_agreed and p.privacy_agreed
    and p.date_of_birth <= ((now() at time zone 'UTC')::date - interval '13 years')::date
    and (p.date_of_birth <= ((now() at time zone 'UTC')::date - interval '18 years')::date or (
      p.guardian_consented and p.guardian_consented_at is not null
      and coalesce(length(trim(p.guardian_name)), 0) > 0
      and coalesce(p.guardian_email, '') ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ));
$$;
commit;
