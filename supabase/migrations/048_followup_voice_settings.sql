begin;
create table public.followup_voice_settings (
  id boolean primary key default true check (id),
  note text not null default '' check (char_length(note) <= 1200),
  examples jsonb not null default '[]' check (jsonb_typeof(examples) = 'array' and jsonb_array_length(examples) <= 3),
  updated_at timestamptz not null default now()
);
insert into public.followup_voice_settings (id) values (true);
alter table public.followup_voice_settings enable row level security;
revoke all on public.followup_voice_settings from public, anon, authenticated;
grant select on public.followup_voice_settings to authenticated;
grant select, update on public.followup_voice_settings to service_role;
create policy "Staff can read team coaching voice" on public.followup_voice_settings
  for select to authenticated using (public.is_admin());
commit;
