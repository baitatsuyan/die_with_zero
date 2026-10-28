-- 紹介の対象の不動産が決まっているときは、「不動産」の範囲で渡すのをその1件だけにする。
-- 0001_init.sql を実行したあとに、Supabase の SQL Editor で実行する（何度実行してもよい）。

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

grant execute on function public.referral_client_data(uuid) to authenticated;
