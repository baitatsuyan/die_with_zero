"use client";

// 事務所向けツールのデータ（デモ版）。いまはこのブラウザの localStorage にだけ保存する。
// Supabase 導入時は、この関数群（login / addClient / updateClient …）を同じ形のまま DB 呼び出しに差し替える。

import { useSyncExternalStore } from "react";
import { newClientPlan, type ClientPlan } from "@/lib/clientPlan";
import { loadJSON, saveJSON } from "@/lib/storage";

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

type State = {
  currentOfficeId: string | null;
  clients: Client[];
};

// デモ用の参加事務所（架空）。本番では事務所登録と運営の承認で作られる
export const DEMO_OFFICES: Office[] = [
  { id: "office-tax", name: "中央相続税理士事務所（デモ）", type: "tax_accountant", area: { prefecture: "東京都", city: "中央区" }, specialties: ["相続税申告", "生前贈与"] },
  { id: "office-re", name: "月島不動産（デモ）", type: "real_estate", area: { prefecture: "東京都", city: "中央区" }, specialties: ["空き家売却", "住み替え"] },
  { id: "office-js", name: "日本橋司法書士事務所（デモ）", type: "judicial_scrivener", area: { prefecture: "東京都", city: "中央区" }, specialties: ["相続登記", "売買の登記"] },
];

const STORAGE_KEY = "office-demo-v1";
const EMPTY: State = { currentOfficeId: null, clients: [] };

let state: State = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  state = { ...EMPTY, ...loadJSON<State>(STORAGE_KEY) };
}

function setState(next: State) {
  state = next;
  saveJSON(STORAGE_KEY, state);
  listeners.forEach((l) => l());
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

/** 画面からデータを読むためのフック。サーバー描画時は空の状態を返す。 */
export function useOfficeStore() {
  const s = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  // ブラウザで localStorage を読める状態になったか（サーバー描画・ハイドレーション中は false）
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const office = DEMO_OFFICES.find((o) => o.id === s.currentOfficeId) ?? null;
  return {
    office,
    clients: office ? s.clients.filter((c) => c.ownerOfficeId === office.id) : [],
    ready,
  };
}

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()));

/** 見本の顧客。初めてログインした事務所の一覧が空にならないように入れる。 */
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

export function login(officeId: string) {
  ensureLoaded();
  const hasClients = state.clients.some((c) => c.ownerOfficeId === officeId);
  setState({ ...state, currentOfficeId: officeId, clients: hasClients ? state.clients : [...state.clients, sampleClient(officeId)] });
}

export function logout() {
  ensureLoaded();
  setState({ ...state, currentOfficeId: null });
}

export function addClient(name: string, birthYear: number): string {
  ensureLoaded();
  if (!state.currentOfficeId) throw new Error("not logged in");
  const now = new Date().toISOString();
  const client: Client = { id: newId(), ownerOfficeId: state.currentOfficeId, status: "pre_meeting", plan: newClientPlan(name, birthYear), createdAt: now, updatedAt: now };
  setState({ ...state, clients: [...state.clients, client] });
  return client.id;
}

export function updateClient(id: string, patch: { status?: ClientStatus; plan?: ClientPlan }) {
  ensureLoaded();
  setState({
    ...state,
    clients: state.clients.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c)),
  });
}

export function deleteClient(id: string) {
  ensureLoaded();
  setState({ ...state, clients: state.clients.filter((c) => c.id !== id) });
}
