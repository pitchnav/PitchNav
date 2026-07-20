-- Require confirmed payment before video submission records or order-path storage uploads.
alter table public.video_submissions
  add column if not exists trim_start_secs numeric(8,3) not null default 0,
  add column if not exists trim_end_secs numeric(8,3);

create or replace function public.require_paid_video_submission()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.orders where id = new.order_id and user_id = new.user_id and payment_confirmed_at is not null) then
    raise exception 'Payment must be confirmed before videos can be saved.' using errcode = 'P0001';
  end if;
  return new;
end; $$;

drop trigger if exists require_paid_video_submission_trigger on public.video_submissions;
create trigger require_paid_video_submission_trigger before insert on public.video_submissions
for each row execute function public.require_paid_video_submission();

drop policy if exists "Athletes can upload their own videos" on storage.objects;
create policy "Athletes can upload paid order videos" on storage.objects for insert
with check (
  bucket_id = 'pitch-videos'
  and auth.uid()::text = (string_to_array(name, '/'))[1]
  and (
    (string_to_array(name, '/'))[2] = 'motion-lab'
    or exists (
      select 1 from public.orders o
      where o.id::text = (string_to_array(name, '/'))[2]
        and o.user_id = auth.uid()
        and o.payment_confirmed_at is not null
    )
  )
);
