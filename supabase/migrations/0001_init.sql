-- 使い切りプランナー：事務所・スタッフ・顧客・紹介・同意（仕様書v2 §9）
-- Supabase の SQL Editor に貼って実行する。何度実行しても壊れないよう、作成は if not exists で行う。
--
-- アクセス制御の原則（RLS）
--   ・顧客データは、登録した事務所（owner_office_id）のスタッフだけが読み書きできる
--   ・紹介先の事務所は、紹介を受諾し、かつ同意が有効な間だけ、同意した範囲のデータを読める
--     （顧客テーブルは直接読ませず、referral_client_data() で範囲を絞って返す）
--   ・同意を撤回すると、すぐに読めなくなる
--   ・事務所は運営の承認（status = 'active'）までは顧客データを扱えない


-- ---------- 事務所・スタッフ ----------

create table if not exists public.offices (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  type text not null check (type in ('real_estate', 'tax_accountant', 'judicial_scrivener')),
  plan text not null default 'standard' check (plan in ('standard', 'exclusive_area')),
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  prefecture text not null,
  city text not null,
  specialties text[] not null default '{}',
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.staff_users (
  id uuid primary key references auth.users (id) on delete cascade,
  office_id uuid not null references public.offices (id) on delete cascade,
  role text not null default 'staff' check (role in ('office_admin', 'staff')),
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

-- エリア独占枠（不動産会社のみ、市区町村ごとに1社）。運営だけが書き込む
create table if not exists public.exclusive_area_slots (
  prefecture text not null,
  city text not null,
  office_id uuid not null references public.offices (id) on delete cascade,
  start_date date not null default current_date,
  primary key (prefecture, city)
);

-- ---------- 顧客 ----------

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_office_id uuid not null references public.offices (id) on delete cascade,
  assigned_staff_id uuid references public.staff_users (id) on delete set null,
  status text not null default 'pre_meeting' check (status in ('pre_meeting', 'planning', 'decided', 'referred', 'closed')),
  plan jsonb not null, -- lib/clientPlan.ts の ClientPlan
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists clients_owner_idx on public.clients (owner_office_id);

-- ---------- 紹介・同意 ----------

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  from_office_id uuid not null references public.offices (id) on delete cascade,
  to_office_id uuid not null references public.offices (id) on delete cascade,
  purpose text not null check (purpose in ('sale', 'registration', 'inheritance_tax', 'gift', 'transfer_tax', 'other')),
  real_estate_id text, -- plan.realEstates[].id
  message text,
  status text not null default 'awaiting_consent'
    check (status in ('awaiting_consent', 'sent', 'accepted', 'declined', 'in_progress', 'won', 'lost', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_office_id <> to_office_id)
);
create index if not exists referrals_to_idx on public.referrals (to_office_id);
create index if not exists referrals_from_idx on public.referrals (from_office_id);

create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  scopes text[] not null check (scopes <@ array['basic', 'real_estate', 'financial', 'family', 'simulation'] and cardinality(scopes) > 0),
  method text not null check (method in ('in_meeting', 'email_link')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);
-- 1つの紹介に有効な同意は1つまで
create unique index if not exists consents_active_idx on public.consents (referral_id) where revoked_at is null;

-- ---------- 補助関数 ----------

-- ログイン中のスタッフが所属する「承認済み」事務所。未承認・停止中なら null
create or replace function public.current_office_id() returns uuid
language sql stable security definer set search_path = public as $$
  select s.office_id from staff_users s join offices o on o.id = s.office_id
  where s.id = auth.uid() and o.status = 'active'
$$;

-- 承認前でも自分の事務所は見られるように
create or replace function public.my_office_id() returns uuid
language sql stable security definer set search_path = public as $$
  select office_id from staff_users where id = auth.uid()
$$;

-- 事務所の登録：事務所（承認待ち）と、登録した本人を事務所管理者として作る
create or replace function public.register_office(p_name text, p_type text, p_prefecture text, p_city text, p_staff_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_office uuid;
  v_email text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if exists (select 1 from staff_users where id = auth.uid()) then raise exception 'already registered'; end if;
  select email into v_email from auth.users where id = auth.uid();
  insert into offices (name, type, prefecture, city) values (p_name, p_type, p_prefecture, p_city) returning id into v_office;
  insert into staff_users (id, office_id, role, name, email) values (auth.uid(), v_office, 'office_admin', p_staff_name, coalesce(v_email, ''));
  return v_office;
end $$;

-- updated_at を自動で更新
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists clients_touch on public.clients;
create trigger clients_touch before update on public.clients for each row execute function public.touch_updated_at();
drop trigger if exists referrals_touch on public.referrals;
create trigger referrals_touch before update on public.referrals for each row execute function public.touch_updated_at();

-- 紹介のステータスは、送った側・受けた側それぞれに許された変更だけを通す
create or replace function public.check_referral_transition() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_office uuid := current_office_id();
begin
  if new.client_id <> old.client_id or new.from_office_id <> old.from_office_id or new.to_office_id <> old.to_office_id then
    raise exception 'referral parties cannot be changed';
  end if;
  if new.status = old.status then return new; end if;
  -- 同意の記録（consents の trigger）による awaiting_consent → sent はここを通る
  if old.status = 'awaiting_consent' and new.status = 'sent' and current_setting('app.consent_trigger', true) = 'on' then return new; end if;
  if v_office = old.from_office_id and new.status = 'withdrawn' and old.status in ('awaiting_consent', 'sent', 'declined') then return new; end if;
  if v_office = old.to_office_id and (
       (old.status = 'sent' and new.status in ('accepted', 'declined'))
    or (old.status in ('accepted', 'in_progress') and new.status in ('in_progress', 'won', 'lost'))
  ) then return new; end if;
  raise exception 'invalid referral status change: % -> %', old.status, new.status;
end $$;

drop trigger if exists referrals_transition on public.referrals;
create trigger referrals_transition before update on public.referrals for each row execute function public.check_referral_transition();

-- 同意が記録されたら、紹介を相手の受信箱へ送る
create or replace function public.on_consent_granted() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.consent_trigger', 'on', true);
  update referrals set status = 'sent' where id = new.referral_id and status = 'awaiting_consent';
  perform set_config('app.consent_trigger', 'off', true);
  return new;
end $$;

drop trigger if exists consents_granted on public.consents;
create trigger consents_granted after insert on public.consents for each row execute function public.on_consent_granted();

-- 紹介先が読める顧客データ：受諾済み・同意が有効な間だけ、同意した範囲に絞って返す
create or replace function public.referral_client_data(p_referral uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  r referrals%rowtype;
  c consents%rowtype;
  p jsonb;
  out jsonb := '{}'::jsonb;
begin
  select * into r from referrals where id = p_referral;
  if not found or r.to_office_id is distinct from current_office_id() or r.status not in ('accepted', 'in_progress', 'won', 'lost') then
    return null;
  end if;
  select * into c from consents where referral_id = p_referral and revoked_at is null;
  if not found then return null; end if;
  select plan into p from clients where id = r.client_id;
  if 'basic' = any (c.scopes) then out := out || jsonb_build_object('name', p -> 'name', 'birthYear', p -> 'birthYear'); end if;
  if 'family' = any (c.scopes) then out := out || jsonb_build_object('hasSpouse', p -> 'hasSpouse', 'childrenCount', p -> 'childrenCount'); end if;
  -- 紹介の対象の不動産が決まっていれば、その1件だけを渡す（自宅など、ほかの不動産は渡さない）
  if 'real_estate' = any (c.scopes) then
    out := out || jsonb_build_object('realEstates', coalesce(
      (select jsonb_agg(e) from jsonb_array_elements(coalesce(p -> 'realEstates', '[]'::jsonb)) e
        where r.real_estate_id is null or e ->> 'id' = r.real_estate_id),
      '[]'::jsonb));
  end if;
  if 'financial' = any (c.scopes) then
    out := out || jsonb_build_object('cash', p -> 'cash', 'securities', p -> 'securities', 'deathBenefit', p -> 'deathBenefit',
      'liabilities', p -> 'liabilities', 'pensionMonthly', p -> 'pensionMonthly', 'monthlyLivingCost', p -> 'monthlyLivingCost');
  end if;
  if 'simulation' = any (c.scopes) then out := out || jsonb_build_object('plan', p); end if;
  return out || jsonb_build_object('scopes', to_jsonb(c.scopes));
end $$;

-- ---------- RLS ----------

alter table public.offices enable row level security;
alter table public.staff_users enable row level security;
alter table public.exclusive_area_slots enable row level security;
alter table public.clients enable row level security;
alter table public.referrals enable row level security;
alter table public.consents enable row level security;

-- 事務所：承認済みの事務所は紹介先として互いに見える。自分の事務所は承認前でも見える
drop policy if exists offices_select on public.offices;
create policy offices_select on public.offices for select to authenticated
  using (status = 'active' or id = my_office_id());
-- 事務所管理者はプロフィールだけ更新できる（status・plan は運営だけが変える。列の権限で制限）
drop policy if exists offices_update on public.offices;
create policy offices_update on public.offices for update to authenticated
  using (id = my_office_id() and exists (select 1 from staff_users where id = auth.uid() and role = 'office_admin'));
revoke insert, update, delete on public.offices from anon, authenticated;
grant update (name, prefecture, city, specialties, description) on public.offices to authenticated;

-- スタッフ：同じ事務所のスタッフだけ見える。追加は register_office（と、今後の招待機能）から
drop policy if exists staff_select on public.staff_users;
create policy staff_select on public.staff_users for select to authenticated
  using (office_id = my_office_id());
revoke insert, update, delete on public.staff_users from anon, authenticated;

drop policy if exists slots_select on public.exclusive_area_slots;
create policy slots_select on public.exclusive_area_slots for select to authenticated using (true);
revoke insert, update, delete on public.exclusive_area_slots from anon, authenticated;

-- 顧客：登録した（承認済みの）事務所のスタッフだけ
drop policy if exists clients_all on public.clients;
create policy clients_all on public.clients for all to authenticated
  using (owner_office_id = current_office_id())
  with check (owner_office_id = current_office_id());

-- 紹介：送った側と受けた側が見られる。作れるのは顧客を登録した事務所だけで、相手は承認済みの事務所
drop policy if exists referrals_select on public.referrals;
-- 受けた側の受信箱に届くのは、顧客の同意が済んでから
create policy referrals_select on public.referrals for select to authenticated
  using (from_office_id = current_office_id() or (to_office_id = current_office_id() and status <> 'awaiting_consent'));
drop policy if exists referrals_insert on public.referrals;
create policy referrals_insert on public.referrals for insert to authenticated
  with check (
    from_office_id = current_office_id()
    and status = 'awaiting_consent'
    and exists (select 1 from clients where id = client_id and owner_office_id = current_office_id())
    and exists (select 1 from offices where id = to_office_id and status = 'active')
  );
drop policy if exists referrals_update on public.referrals;
create policy referrals_update on public.referrals for update to authenticated
  using (from_office_id = current_office_id() or (to_office_id = current_office_id() and status <> 'awaiting_consent'));
revoke delete on public.referrals from anon, authenticated;

-- 同意：顧客を登録した事務所が記録・撤回する（面談中の同意）。紹介先は同意の有無と範囲を見られる
drop policy if exists consents_select on public.consents;
create policy consents_select on public.consents for select to authenticated
  using (exists (select 1 from referrals r where r.id = referral_id and (r.from_office_id = current_office_id() or r.to_office_id = current_office_id())));
drop policy if exists consents_insert on public.consents;
create policy consents_insert on public.consents for insert to authenticated
  with check (
    revoked_at is null
    and exists (select 1 from referrals r join clients cl on cl.id = r.client_id
                where r.id = referral_id and r.client_id = consents.client_id
                  and r.from_office_id = current_office_id() and cl.owner_office_id = current_office_id())
  );
-- 撤回（revoked_at を入れる）だけを許す
drop policy if exists consents_update on public.consents;
create policy consents_update on public.consents for update to authenticated
  using (exists (select 1 from clients cl where cl.id = client_id and cl.owner_office_id = current_office_id()));
revoke update, delete on public.consents from anon, authenticated;
grant update (revoked_at) on public.consents to authenticated;

grant execute on function public.register_office(text, text, text, text, text) to authenticated;
grant execute on function public.referral_client_data(uuid) to authenticated;
