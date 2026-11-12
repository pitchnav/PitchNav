// Run against an isolated PostgreSQL/WASM database. PGLITE_MODULE can point
// to a local copy. No Supabase project, keys or network connection is used.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite')
const db = new PGlite()
const owner = '10000000-0000-4000-8000-000000000001'
const other = '10000000-0000-4000-8000-000000000002'
const profile = '20000000-0000-4000-8000-000000000001'
const order = '30000000-0000-4000-8000-000000000001'
await db.exec(`
  create role authenticated;
  create role service_role bypassrls;
  create schema auth;
  create schema storage;
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
  create function public.is_admin() returns boolean language sql stable as
    $$ select current_setting('test.staff',true) = 'yes' $$;
  create table public.athlete_profiles(id uuid primary key,user_id uuid not null);
  create table public.orders(
    id uuid primary key default gen_random_uuid(), user_id uuid not null, athlete_profile_id uuid not null,
    status text not null default 'intake_started', currency text default 'usd', amount_paid_cents int,
    analyst_id uuid, internal_notes text, is_demo boolean not null default false,
    payment_confirmed_at timestamptz, refunded_at timestamptz, refund_reason text,
    stripe_checkout_session_id text, stripe_payment_intent_id text,
    submitted_at timestamptz, completed_at timestamptz, follow_up_available_at timestamptz, follow_up_completed_at timestamptz
  );
  create table public.video_submissions(id uuid primary key default gen_random_uuid(), order_id uuid, user_id uuid, note text);
  create table storage.objects(bucket_id text, name text);
  alter table public.orders enable row level security;
  alter table public.video_submissions enable row level security;
  alter table storage.objects enable row level security;
  create policy order_read on public.orders for select using(user_id=auth.uid() or public.is_admin());
  create policy video_read on public.video_submissions for select using(user_id=auth.uid() or public.is_admin());
  create policy video_insert on public.video_submissions for insert with check(user_id=auth.uid());
  create policy video_manage on public.video_submissions for all using(public.is_admin());
  grant usage on schema auth,storage,public to authenticated,service_role;
  grant select,insert,update on all tables in schema public,storage to authenticated,service_role;
  insert into public.athlete_profiles values ('${profile}','${owner}');
`)
const migration = await readFile(new URL('../migrations/039_order_billing_and_video_access.sql', import.meta.url), 'utf8')
await db.exec(migration)
await db.exec(migration)
await db.exec('create trigger require_paid_video_submission_trigger before insert on public.video_submissions for each row execute function public.require_paid_video_submission()')
let checks = 0
async function role(name, staff = false) {
  await db.exec(`reset role; set role ${name}; set test.uid='${owner}'; set test.staff='${staff ? 'yes' : 'no'}'`)
}
async function allowed(sql, args) { await db.query(sql, args); checks++ }
async function denied(sql, args) {
  await assert.rejects(db.query(sql, args), error => ['42501','P0001'].includes(error.code))
  checks++
}
const saveVideo = 'insert into public.video_submissions(order_id,user_id) values ($1,$2)'
const saveObject = 'insert into storage.objects values ($1,$2)'
await role('authenticated')
for (const status of ['intake_started', 'awaiting_videos', 'awaiting_payment']) {
  await allowed('insert into orders(user_id,athlete_profile_id,status) values($1,$2,$3)', [owner, profile, status])
}
await denied('insert into orders(user_id,athlete_profile_id) values($1,$2)', [other, profile])
await denied('insert into orders(user_id,athlete_profile_id) values($1,$2)', [owner, other])
for (const [column,value] of [['status','complete'], ['amount_paid_cents',2500], ['stripe_checkout_session_id','fixture'],
  ['refunded_at','2026-11-11'], ['payment_confirmed_at','2026-11-11']]) {
  await denied(`insert into orders(user_id,athlete_profile_id,${column}) values($1,$2,$3)`, [owner,profile,value])
}
await allowed('insert into orders(id,user_id,athlete_profile_id) values($1,$2,$3)', [order,owner,profile])
await denied(saveVideo, [order,owner])
await denied(saveObject, ['pitch-videos',`${owner}/${order}/sample.mp4`])
await allowed(saveObject, ['pitch-videos',`${owner}/motion-lab/sample.mp4`])
await role('service_role')
await allowed("update orders set status='awaiting_videos',payment_confirmed_at=now() where id=$1", [order])
await role('authenticated')
await allowed(saveVideo, [order,owner])
await allowed(saveObject, ['pitch-videos',`${owner}/${order}/sample.mp4`])
await denied(saveObject, ['pitch-videos',`${other}/${order}/sample.mp4`])
for (const [status, refunded] of [['cancelled',false], ['refunded',false], ['submitted',true]]) {
  await role('service_role')
  await db.query('update orders set status=$1,refunded_at=case when $2 then now() end where id=$3', [status,refunded,order])
  await role('authenticated')
  await denied(saveVideo, [order,owner])
  await denied(saveObject, ['pitch-videos',`${owner}/${order}/sample.mp4`])
  assert.equal((await db.query("update video_submissions set note='fixture' returning id")).rows.length,0); checks++
}
await role('authenticated', true)
await allowed("insert into orders(user_id,athlete_profile_id,status) values($1,$2,'complete')", [other,profile])
assert.equal((await db.query("update video_submissions set note='staff review' returning id")).rows.length,1); checks++
await db.close()
console.log(`PASS: ${checks} billing/order permission checks in isolated PostgreSQL. Migration 039 applied twice.`)
