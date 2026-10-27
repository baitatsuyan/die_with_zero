// マイグレーションと RLS の検証。npm run test:db で実行する（PGlite = WebAssembly 版の Postgres を使い、DBサーバーは不要）。
// Supabase の auth スキーマとロールを最小限まねて、マイグレーションと RLS を検証する
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const db = new PGlite();
const A = "00000000-0000-0000-0000-00000000000a"; // 税理士
const B = "00000000-0000-0000-0000-00000000000b"; // 不動産会社
const C = "00000000-0000-0000-0000-00000000000c"; // 無関係の事務所
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${name} ${extra}`);
};

await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon; create role authenticated;
  grant usage on schema public to anon, authenticated;
  grant usage on schema auth to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
  insert into auth.users values ('${A}', 'a@example.com'), ('${B}', 'b@example.com'), ('${C}', 'c@example.com');
`);
await db.exec(readFileSync(new URL("../migrations/0001_init.sql", import.meta.url), "utf8"));
// 2回目の実行でも壊れないこと
await db.exec(readFileSync(new URL("../migrations/0001_init.sql", import.meta.url), "utf8"));
ok("migration runs twice", true);

const as = async (uid, sql, params) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false); set role ${uid ? "authenticated" : "anon"};`);
  try { return { rows: (await db.query(sql, params)).rows }; } catch (e) { return { error: e.message }; } finally { await db.exec("reset role"); }
};
const admin = (sql) => db.query(sql);

const ra = await as(A, `select register_office('中央相続税理士事務所', 'tax_accountant', '東京都', '中央区', '山田')`);
const officeA = ra.rows[0].register_office;
const officeB = (await as(B, `select register_office('月島不動産', 'real_estate', '東京都', '中央区', '佐藤')`)).rows[0].register_office;
const officeC = (await as(C, `select register_office('他区の司法書士', 'judicial_scrivener', '東京都', '港区', '鈴木')`)).rows[0].register_office;
ok("register twice is rejected", (await as(A, `select register_office('x','tax_accountant','東京都','中央区','x')`)).error?.includes("already registered"));

const plan = JSON.stringify({ name: "山田 花子", birthYear: 1956, hasSpouse: true, childrenCount: 2, cash: 2500, securities: 1500, realEstates: [{ id: "r1", label: "実家", value: 4200 }] });
ok("pending office cannot add clients", !!(await as(A, `insert into clients (owner_office_id, plan) values ($1, $2)`, [officeA, plan])).error);
ok("pending office sees its own office", (await as(A, `select id from offices`)).rows.length === 1);

await admin(`update offices set status = 'active'`);
ok("staff cannot activate/change plan", !!(await as(B, `update offices set plan = 'exclusive_area' where id = '${officeB}'`)).error);
const descUpdate = await as(B, `update offices set description = '空き家の売却が得意です' where id = '${officeB}' returning id`);
ok("office admin can update profile", descUpdate.rows?.length === 1, descUpdate.error ?? "");
ok("cannot update another office", (await as(B, `update offices set description = 'x' where id = '${officeA}' returning id`)).rows?.length === 0);

const ins = await as(A, `insert into clients (owner_office_id, plan) values ($1, $2) returning id`, [officeA, plan]);
const clientId = ins.rows[0].id;
ok("active office adds a client", !!clientId);
ok("cannot add a client for another office", !!(await as(A, `insert into clients (owner_office_id, plan) values ($1, $2)`, [officeB, plan])).error);
ok("other office cannot read the client", (await as(B, `select * from clients`)).rows.length === 0);
ok("anon cannot read clients", (await as(null, `select * from clients`)).rows?.length === 0);
ok("offices directory visible to others", (await as(B, `select id from offices`)).rows.length === 3);

const ref = await as(A, `insert into referrals (client_id, from_office_id, to_office_id, purpose) values ($1, $2, $3, 'sale') returning id, status`, [clientId, officeA, officeB]);
const refId = ref.rows[0].id;
ok("referral starts awaiting consent", ref.rows[0].status === "awaiting_consent");
ok("cannot refer someone else's client", !!(await as(B, `insert into referrals (client_id, from_office_id, to_office_id, purpose) values ($1, $2, $3, 'sale')`, [clientId, officeB, officeC])).error);
ok("receiver cannot see it before consent", (await as(B, `select * from referrals`)).rows.length === 0);
ok("receiver cannot accept before consent", (await as(B, `update referrals set status = 'accepted' where id = '${refId}' returning id`)).rows?.length === 0);
ok("sender cannot fake 'sent' without consent", !!(await as(A, `update referrals set status = 'sent' where id = '${refId}'`)).error);

const con = await as(A, `insert into consents (referral_id, client_id, scopes, method) values ($1, $2, '{basic,real_estate}', 'in_meeting') returning id`, [refId, clientId]);
ok("owner records consent", !!con.rows?.[0]?.id, con.error ?? "");
ok("consent moves referral to receiver's inbox", (await as(B, `select status from referrals`)).rows[0]?.status === "sent");
ok("no data before accepting", (await as(B, `select referral_client_data('${refId}') d`)).rows[0].d === null);
ok("sender cannot accept on receiver's behalf", !!(await as(A, `update referrals set status = 'accepted' where id = '${refId}'`)).error);
ok("receiver accepts", (await as(B, `update referrals set status = 'accepted' where id = '${refId}' returning status`)).rows?.[0]?.status === "accepted");
const data = (await as(B, `select referral_client_data('${refId}') d`)).rows[0].d;
ok("receiver gets consented scopes only", data?.name === "山田 花子" && Array.isArray(data?.realEstates) && data?.cash === undefined, JSON.stringify(data));
ok("still cannot read clients table directly", (await as(B, `select * from clients`)).rows.length === 0);
ok("unrelated office sees nothing", (await as(C, `select referral_client_data('${refId}') d`)).rows[0].d === null && (await as(C, `select * from referrals`)).rows.length === 0);
ok("receiver cannot jump back to sent", !!(await as(B, `update referrals set status = 'sent' where id = '${refId}'`)).error);
ok("receiver marks in progress", (await as(B, `update referrals set status = 'in_progress' where id = '${refId}' returning status`)).rows?.[0]?.status === "in_progress");
ok("receiver cannot change consent", (await as(B, `update consents set revoked_at = now() returning id`)).rows?.length === 0);

ok("owner revokes consent", (await as(A, `update consents set revoked_at = now() where referral_id = '${refId}' returning id`)).rows?.length === 1);
ok("revoked consent hides data immediately", (await as(B, `select referral_client_data('${refId}') d`)).rows[0].d === null);
ok("consent scopes cannot be widened", !!(await as(A, `update consents set scopes = '{basic,financial}' where referral_id = '${refId}'`)).error);
ok("invalid scope rejected", !!(await as(A, `insert into consents (referral_id, client_id, scopes, method) values ($1, $2, '{everything}', 'in_meeting')`, [refId, clientId])).error);
ok("referrals cannot be deleted", !!(await as(A, `delete from referrals where id = '${refId}'`)).error);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
