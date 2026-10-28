"use client";

// 事務所向けツールのデータ。2つのモードがある。
//   ・cloud：Supabase に保存する本番用。メールのリンクでログインし、事務所の登録と運営の承認を経て使う
//   ・demo ：架空の事務所で試すデモ。このブラウザの localStorage にだけ保存する
// 画面はどちらのモードでも、このファイルの useOfficeStore() と各関数だけを使う。

import { useSyncExternalStore } from "react";
import { newClientPlan, type ClientPlan } from "@/lib/clientPlan";
import { loadJSON, saveJSON } from "@/lib/storage";
import {
  canChangeStatus,
  canReadClientData,
  scopeClientData,
  type Consent,
  type ConsentScope,
  type DirectoryOffice,
  type ExclusiveSlot,
  type Referral,
  type ReferralPurpose,
  type ReferralStatus,
  type ScopedClientData,
} from "@/lib/referrals";
import { getSupabase } from "@/lib/supabase";

export type OfficeType = "real_estate" | "tax_accountant" | "judicial_scrivener";

export const OFFICE_TYPE_LABELS: Record<OfficeType, string> = {
  real_estate: "不動産会社",
  tax_accountant: "税理士事務所",
  judicial_scrivener: "司法書士事務所",
};

export type Office = {
  id: string;
  name: string;
  type: OfficeType;
  area: { prefecture: string; city: string };
  specialties: string[];
};

export type ClientStatus = "pre_meeting" | "planning" | "decided" | "referred" | "closed";

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  pre_meeting: "面談前",
  planning: "計画作成中",
  decided: "方針決定",
  referred: "紹介中",
  closed: "完了",
};

export type Client = {
  id: string;
  ownerOfficeId: string;
  status: ClientStatus;
  plan: ClientPlan;
  createdAt: string;
  updatedAt: string;
};

export type CloudState =
  | { phase: "loading" }
  | { phase: "signed_out" }
  | { phase: "error"; message: string }
  | { phase: "needs_registration"; email: string }
  | { phase: "pending"; email: string; office: Office; status: "pending" | "suspended" }
  | { phase: "ready"; email: string; office: Office; staffName: string };

export type SaveStatus = "idle" | "saving" | "saved" | "error";

type Network = { referrals: Referral[]; consents: Consent[]; directory: DirectoryOffice[]; slots: ExclusiveSlot[] };

type State = {
  mode: "demo" | "cloud";
  demoOfficeId: string | null;
  demoClients: Client[];
  demoReferrals: Referral[];
  demoConsents: Consent[];
  cloud: CloudState;
  cloudClients: Client[];
  cloudNetwork: Network;
  save: SaveStatus;
};

// デモ用の参加事務所（架空）
export const DEMO_OFFICES: Office[] = [
  { id: "office-tax", name: "中央相続税理士事務所（デモ）", type: "tax_accountant", area: { prefecture: "東京都", city: "中央区" }, specialties: ["相続税申告", "生前贈与"] },
  { id: "office-re", name: "月島不動産（デモ）", type: "real_estate", area: { prefecture: "東京都", city: "中央区" }, specialties: ["空き家売却", "住み替え"] },
  { id: "office-js", name: "日本橋司法書士事務所（デモ）", type: "judicial_scrivener", area: { prefecture: "東京都", city: "中央区" }, specialties: ["相続登記", "売買の登記"] },
];

// デモの紹介ネットワークにだけいる事務所（ログインはできない）
const DEMO_NETWORK_ONLY: Office[] = [
  { id: "office-re2", name: "勝どき不動産（デモ）", type: "real_estate", area: { prefecture: "東京都", city: "中央区" }, specialties: ["マンション売却"] },
  { id: "office-re3", name: "芝浦不動産（デモ）", type: "real_estate", area: { prefecture: "東京都", city: "港区" }, specialties: ["空き家売却"] },
  { id: "office-tax2", name: "銀座税理士法人（デモ）", type: "tax_accountant", area: { prefecture: "東京都", city: "中央区" }, specialties: ["譲渡所得", "相続税申告"] },
];
const DEMO_DIRECTORY: DirectoryOffice[] = [...DEMO_OFFICES, ...DEMO_NETWORK_ONLY];
// デモでは、中央区の不動産会社のエリア独占枠を月島不動産が持っている
const DEMO_SLOTS: ExclusiveSlot[] = [{ prefecture: "東京都", city: "中央区", officeId: "office-re" }];

const DEMO_KEY = "office-demo-v1"; // { currentOfficeId, clients, referrals, consents }
const MODE_KEY = "office-mode";

const EMPTY_NETWORK: Network = { referrals: [], consents: [], directory: [], slots: [] };
const INITIAL: State = {
  mode: "cloud",
  demoOfficeId: null,
  demoClients: [],
  demoReferrals: [],
  demoConsents: [],
  cloud: { phase: "loading" },
  cloudClients: [],
  cloudNetwork: EMPTY_NETWORK,
  save: "idle",
};

let state: State = INITIAL;
let loaded = false;
const listeners = new Set<() => void>();

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  saveJSON(DEMO_KEY, { currentOfficeId: state.demoOfficeId, clients: state.demoClients, referrals: state.demoReferrals, consents: state.demoConsents });
  saveJSON(MODE_KEY, state.mode);
  listeners.forEach((l) => l());
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  const demo = loadJSON<{ currentOfficeId: string | null; clients: Client[]; referrals?: Referral[]; consents?: Consent[] }>(DEMO_KEY);
  state = {
    ...INITIAL,
    mode: loadJSON<"demo" | "cloud">(MODE_KEY) ?? (demo?.currentOfficeId ? "demo" : "cloud"),
    demoOfficeId: demo?.currentOfficeId ?? null,
    demoClients: demo?.clients ?? [],
    demoReferrals: demo?.referrals ?? [],
    demoConsents: demo?.consents ?? [],
  };
  initCloud();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
const getSnapshot = () => {
  ensureLoaded();
  return state;
};
const noopSubscribe = () => () => {};

/** 画面からデータを読むためのフック。 */
export function useOfficeStore() {
  const s = useSyncExternalStore(subscribe, getSnapshot, () => INITIAL);
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const office =
    s.mode === "demo"
      ? (DEMO_OFFICES.find((o) => o.id === s.demoOfficeId) ?? null)
      : s.cloud.phase === "ready"
        ? s.cloud.office
        : null;
  const clients = s.mode === "demo" ? s.demoClients.filter((c) => c.ownerOfficeId === office?.id) : s.cloudClients;
  return {
    mode: s.mode,
    office,
    clients: office ? clients : [],
    network: office ? (s.mode === "demo" ? demoNetworkFor(s, office.id) : s.cloudNetwork) : EMPTY_NETWORK,
    cloud: s.cloud,
    save: s.save,
    ready: hydrated && (s.mode === "demo" || s.cloud.phase !== "loading"),
  };
}

/** デモで、DB の RLS と同じ見え方にする：送った紹介と、同意済みで届いた紹介だけ。 */
function demoNetworkFor(s: State, officeId: string): Network {
  const referrals = s.demoReferrals.filter((r) => r.fromOfficeId === officeId || (r.toOfficeId === officeId && r.status !== "awaiting_consent"));
  const ids = new Set(referrals.map((r) => r.id));
  return { referrals, consents: s.demoConsents.filter((c) => ids.has(c.referralId)), directory: DEMO_DIRECTORY, slots: DEMO_SLOTS };
}

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()));

// ---------- cloud（Supabase） ----------

type OfficeRow = { id: string; name: string; type: OfficeType; status: "pending" | "active" | "suspended"; prefecture: string; city: string; specialties: string[] };
type ClientRow = { id: string; owner_office_id: string; status: ClientStatus; plan: ClientPlan; created_at: string; updated_at: string };

type ReferralRow = {
  id: string;
  client_id: string;
  from_office_id: string;
  to_office_id: string;
  purpose: ReferralPurpose;
  real_estate_id: string | null;
  message: string | null;
  status: ReferralStatus;
  created_at: string;
  updated_at: string;
};
type ConsentRow = { id: string; referral_id: string; client_id: string; scopes: ConsentScope[]; method: Consent["method"]; granted_at: string; revoked_at: string | null };

const toReferral = (r: ReferralRow): Referral => ({
  id: r.id,
  clientId: r.client_id,
  fromOfficeId: r.from_office_id,
  toOfficeId: r.to_office_id,
  purpose: r.purpose,
  realEstateId: r.real_estate_id,
  message: r.message ?? "",
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
const toConsent = (r: ConsentRow): Consent => ({ id: r.id, referralId: r.referral_id, clientId: r.client_id, scopes: r.scopes, method: r.method, grantedAt: r.granted_at, revokedAt: r.revoked_at });

const toOffice = (r: OfficeRow): Office => ({ id: r.id, name: r.name, type: r.type, area: { prefecture: r.prefecture, city: r.city }, specialties: r.specialties ?? [] });
const toClient = (r: ClientRow): Client => ({
  id: r.id,
  ownerOfficeId: r.owner_office_id,
  status: r.status,
  // 古いデータに無い項目は初期値で補う
  plan: { ...newClientPlan(r.plan?.name ?? "", r.plan?.birthYear ?? 1960), ...r.plan },
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

let cloudStarted = false;

function initCloud() {
  if (cloudStarted) return;
  cloudStarted = true;
  const sb = getSupabase();
  sb.auth.onAuthStateChange((event, session) => {
    // ログインのリンクから戻ってきたら、本番モードに切り替える
    if (event === "SIGNED_IN") setState({ mode: "cloud" });
    // onAuthStateChange の中で Supabase を呼ぶと詰まることがあるため、次の処理に回す
    setTimeout(() => void loadCloud(session?.user ?? null), 0);
  });
}

async function loadCloud(user: { id: string; email?: string } | null) {
  if (!user) return setState({ cloud: { phase: "signed_out" }, cloudClients: [] });
  const sb = getSupabase();
  const email = user.email ?? "";
  const { data: staff, error } = await sb.from("staff_users").select("office_id, name").eq("id", user.id).maybeSingle();
  if (error) return setState({ cloud: { phase: "error", message: error.message } });
  if (!staff) return setState({ cloud: { phase: "needs_registration", email }, cloudClients: [] });

  const { data: officeRow, error: officeError } = await sb.from("offices").select("id, name, type, status, prefecture, city, specialties").eq("id", staff.office_id).single<OfficeRow>();
  if (officeError || !officeRow) return setState({ cloud: { phase: "error", message: officeError?.message ?? "office not found" } });
  const office = toOffice(officeRow);
  if (officeRow.status !== "active") return setState({ cloud: { phase: "pending", email, office, status: officeRow.status }, cloudClients: [] });

  const { data: rows, error: clientsError } = await sb.from("clients").select("id, owner_office_id, status, plan, created_at, updated_at").order("updated_at", { ascending: false });
  if (clientsError) return setState({ cloud: { phase: "error", message: clientsError.message } });
  const network = await loadCloudNetwork();
  if (typeof network === "string") return setState({ cloud: { phase: "error", message: network } });
  setState({ cloud: { phase: "ready", email, office, staffName: staff.name }, cloudClients: (rows as ClientRow[]).map(toClient), cloudNetwork: network });
}

/** 紹介まわりのデータ（RLS で、自分が送った・受けた分と承認済みの事務所だけが返る）。 */
async function loadCloudNetwork(): Promise<Network | string> {
  const sb = getSupabase();
  const [offices, slots, referrals, consents] = await Promise.all([
    sb.from("offices").select("id, name, type, status, prefecture, city, specialties").eq("status", "active"),
    sb.from("exclusive_area_slots").select("prefecture, city, office_id"),
    sb.from("referrals").select("*").order("updated_at", { ascending: false }),
    sb.from("consents").select("*"),
  ]);
  const error = offices.error ?? slots.error ?? referrals.error ?? consents.error;
  if (error) return error.message;
  return {
    directory: (offices.data as OfficeRow[]).map(toOffice),
    slots: (slots.data as { prefecture: string; city: string; office_id: string }[]).map((r) => ({ prefecture: r.prefecture, city: r.city, officeId: r.office_id })),
    referrals: (referrals.data as ReferralRow[]).map(toReferral),
    consents: (consents.data as ConsentRow[]).map(toConsent),
  };
}

async function refreshCloudNetwork() {
  const network = await loadCloudNetwork();
  if (typeof network === "string") throw new Error(network);
  setState({ cloudNetwork: network });
}

/** ログイン用のリンクをメールで送る。 */
export async function sendLoginLink(email: string): Promise<string | null> {
  const { error } = await getSupabase().auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/office` } });
  return error ? error.message : null;
}

/** 事務所を登録する（運営の承認待ちになる）。 */
export async function registerOffice(input: { name: string; type: OfficeType; prefecture: string; city: string; staffName: string }): Promise<string | null> {
  const sb = getSupabase();
  const { error } = await sb.rpc("register_office", {
    p_name: input.name,
    p_type: input.type,
    p_prefecture: input.prefecture,
    p_city: input.city,
    p_staff_name: input.staffName,
  });
  if (error) return error.message;
  const { data } = await sb.auth.getUser();
  await loadCloud(data.user);
  return null;
}

export async function reloadCloud() {
  const { data } = await getSupabase().auth.getUser();
  await loadCloud(data.user);
}

// 計画の入力は1文字ごとに変わるので、少し待ってからまとめて保存する
const pendingSaves = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleCloudSave(id: string) {
  clearTimeout(pendingSaves.get(id));
  setState({ save: "saving" });
  pendingSaves.set(
    id,
    setTimeout(async () => {
      pendingSaves.delete(id);
      const c = state.cloudClients.find((x) => x.id === id);
      if (!c) return;
      const { error } = await getSupabase().from("clients").update({ status: c.status, plan: c.plan }).eq("id", id);
      if (pendingSaves.size === 0) setState({ save: error ? "error" : "saved" });
      else if (error) setState({ save: "error" });
    }, 700),
  );
}

// ---------- 共通の操作 ----------

/** デモの事務所で試す。 */
export function startDemo(officeId: string) {
  ensureLoaded();
  const hasClients = state.demoClients.some((c) => c.ownerOfficeId === officeId);
  setState({
    mode: "demo",
    demoOfficeId: officeId,
    demoClients: hasClients ? state.demoClients : [...state.demoClients, sampleClient(officeId)],
  });
}

export async function logout() {
  ensureLoaded();
  if (state.mode === "demo") return setState({ demoOfficeId: null, mode: "cloud" });
  await getSupabase().auth.signOut();
  setState({ cloud: { phase: "signed_out" }, cloudClients: [], cloudNetwork: EMPTY_NETWORK });
}

export async function addClient(name: string, birthYear: number): Promise<string> {
  ensureLoaded();
  const plan = newClientPlan(name, birthYear);
  if (state.mode === "demo") {
    if (!state.demoOfficeId) throw new Error("not logged in");
    const now = new Date().toISOString();
    const client: Client = { id: newId(), ownerOfficeId: state.demoOfficeId, status: "pre_meeting", plan, createdAt: now, updatedAt: now };
    setState({ demoClients: [...state.demoClients, client] });
    return client.id;
  }
  if (state.cloud.phase !== "ready") throw new Error("not logged in");
  const { data, error } = await getSupabase()
    .from("clients")
    .insert({ owner_office_id: state.cloud.office.id, plan })
    .select("id, owner_office_id, status, plan, created_at, updated_at")
    .single<ClientRow>();
  if (error || !data) throw new Error(error?.message ?? "insert failed");
  setState({ cloudClients: [toClient(data), ...state.cloudClients] });
  return data.id;
}

export function updateClient(id: string, patch: { status?: ClientStatus; plan?: ClientPlan }) {
  ensureLoaded();
  const apply = (list: Client[]) => list.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c));
  if (state.mode === "demo") return setState({ demoClients: apply(state.demoClients) });
  setState({ cloudClients: apply(state.cloudClients) });
  scheduleCloudSave(id);
}

export async function deleteClient(id: string) {
  ensureLoaded();
  if (state.mode === "demo") return setState({ demoClients: state.demoClients.filter((c) => c.id !== id) });
  clearTimeout(pendingSaves.get(id));
  pendingSaves.delete(id);
  const { error } = await getSupabase().from("clients").delete().eq("id", id);
  if (error) throw new Error(error.message);
  setState({ cloudClients: state.cloudClients.filter((c) => c.id !== id) });
}

/** 見本の顧客。デモの事務所に初めて入ったとき、一覧が空にならないように入れる。 */
function sampleClient(officeId: string): Client {
  const now = new Date().toISOString();
  const plan: ClientPlan = {
    ...newClientPlan("山田 花子（見本）", 1956),
    cash: 2500,
    securities: 1500,
    deathBenefit: 500,
    realEstates: [
      { id: newId(), label: "自宅", propertyType: "condo", prefecture: "東京都", city: "中央区", district: "月島", use: "home", value: 6800, policy: "keep" },
      { id: newId(), label: "実家", propertyType: "house", prefecture: "東京都", city: "中央区", district: "佃", use: "vacant", value: 4200, policy: "undecided" },
    ],
    memo: "実家（佃）は空き家。長男は売却に前向き、長女は迷っている。",
  };
  return { id: newId(), ownerOfficeId: officeId, status: "planning", plan, createdAt: now, updatedAt: now };
}

// ---------- 紹介 ----------

const currentOfficeId = () => (state.mode === "demo" ? state.demoOfficeId : state.cloud.phase === "ready" ? state.cloud.office.id : null);

/** 紹介を作る（お客さまの同意待ちの状態）。 */
export async function createReferral(input: { clientId: string; toOfficeId: string; purpose: ReferralPurpose; realEstateId: string | null; message: string }): Promise<string> {
  ensureLoaded();
  const from = currentOfficeId();
  if (!from) throw new Error("not logged in");
  if (state.mode === "demo") {
    const now = new Date().toISOString();
    const referral: Referral = { id: newId(), fromOfficeId: from, status: "awaiting_consent", createdAt: now, updatedAt: now, ...input };
    setState({ demoReferrals: [referral, ...state.demoReferrals] });
    return referral.id;
  }
  const { data, error } = await getSupabase()
    .from("referrals")
    .insert({ client_id: input.clientId, from_office_id: from, to_office_id: input.toOfficeId, purpose: input.purpose, real_estate_id: input.realEstateId, message: input.message || null })
    .select("*")
    .single<ReferralRow>();
  if (error || !data) throw new Error(error?.message ?? "insert failed");
  setState({ cloudNetwork: { ...state.cloudNetwork, referrals: [toReferral(data), ...state.cloudNetwork.referrals] } });
  return data.id;
}

/** お客さまの同意を記録する。紹介は相手の受信箱に届き、顧客のステータスは「紹介中」になる。 */
export async function grantConsent(referralId: string, scopes: ConsentScope[]) {
  ensureLoaded();
  const all = state.mode === "demo" ? state.demoReferrals : state.cloudNetwork.referrals;
  const referral = all.find((r) => r.id === referralId);
  if (!referral || referral.status !== "awaiting_consent") throw new Error("この紹介は同意を記録できる状態ではありません");
  const markReferred = () => {
    const c = (state.mode === "demo" ? state.demoClients : state.cloudClients).find((x) => x.id === referral.clientId);
    if (c && ["pre_meeting", "planning", "decided"].includes(c.status)) updateClient(c.id, { status: "referred" });
  };
  if (state.mode === "demo") {
    const now = new Date().toISOString();
    const consent: Consent = { id: newId(), referralId, clientId: referral.clientId, scopes, method: "in_meeting", grantedAt: now, revokedAt: null };
    setState({
      demoConsents: [...state.demoConsents, consent],
      demoReferrals: state.demoReferrals.map((r) => (r.id === referralId ? { ...r, status: "sent", updatedAt: now } : r)),
    });
    return markReferred();
  }
  const { error } = await getSupabase().from("consents").insert({ referral_id: referralId, client_id: referral.clientId, scopes, method: "in_meeting" });
  if (error) throw new Error(error.message);
  await refreshCloudNetwork();
  markReferred();
}

/** 同意を撤回する。紹介先はすぐにデータを読めなくなる。 */
export async function revokeConsent(referralId: string) {
  ensureLoaded();
  const now = new Date().toISOString();
  if (state.mode === "demo") {
    return setState({ demoConsents: state.demoConsents.map((c) => (c.referralId === referralId && c.revokedAt === null ? { ...c, revokedAt: now } : c)) });
  }
  const { error } = await getSupabase().from("consents").update({ revoked_at: now }).eq("referral_id", referralId).is("revoked_at", null);
  if (error) throw new Error(error.message);
  await refreshCloudNetwork();
}

/** 紹介のステータスを変える（送った側は取り下げ、受けた側は受諾・辞退・対応状況）。 */
export async function changeReferralStatus(referralId: string, next: ReferralStatus) {
  ensureLoaded();
  const me = currentOfficeId();
  const all = state.mode === "demo" ? state.demoReferrals : state.cloudNetwork.referrals;
  const r = all.find((x) => x.id === referralId);
  if (!r || !me) throw new Error("not found");
  const side = r.fromOfficeId === me ? "from" : "to";
  if (!canChangeStatus(side, r.status, next)) throw new Error("このステータスには変更できません");
  if (state.mode === "demo") {
    const now = new Date().toISOString();
    return setState({ demoReferrals: state.demoReferrals.map((x) => (x.id === referralId ? { ...x, status: next, updatedAt: now } : x)) });
  }
  const { error } = await getSupabase().from("referrals").update({ status: next }).eq("id", referralId);
  if (error) throw new Error(error.message);
  await refreshCloudNetwork();
}

/** 紹介先として、同意された範囲の顧客データを読む。読めないときは null。 */
export async function fetchReferredClient(referralId: string): Promise<ScopedClientData | null> {
  ensureLoaded();
  if (state.mode === "demo") {
    const r = state.demoReferrals.find((x) => x.id === referralId);
    const consent = state.demoConsents.find((c) => c.referralId === referralId && c.revokedAt === null);
    const client = r && state.demoClients.find((c) => c.id === r.clientId);
    if (!r || !client || r.toOfficeId !== state.demoOfficeId || !canReadClientData(r.status, consent)) return null;
    return scopeClientData(client.plan, consent!.scopes, r.realEstateId);
  }
  const { data, error } = await getSupabase().rpc("referral_client_data", { p_referral: referralId });
  if (error) throw new Error(error.message);
  return (data as ScopedClientData | null) ?? null;
}

/** 事務所の名前などを、紹介ネットワークの一覧から引く。 */
export function findOffice(network: { directory: DirectoryOffice[] }, id: string, self: Office | null): DirectoryOffice | Office | undefined {
  return self?.id === id ? self : network.directory.find((o) => o.id === id);
}
