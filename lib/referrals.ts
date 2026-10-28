// 紹介ネットワークのルール（仕様書v2 §6）。画面とデモ保存の両方から使う純粋関数。
// DB 側は supabase/migrations/0001_init.sql の RLS とトリガーで同じルールを守る。

import type { ClientPlan } from "@/lib/clientPlan";

export type OfficeType = "real_estate" | "tax_accountant" | "judicial_scrivener";
export type ReferralPurpose = "sale" | "registration" | "inheritance_tax" | "gift" | "transfer_tax" | "other";
export type ReferralStatus = "awaiting_consent" | "sent" | "accepted" | "declined" | "in_progress" | "won" | "lost" | "withdrawn";
export type ConsentScope = "basic" | "real_estate" | "financial" | "family" | "simulation";

export type Referral = {
  id: string;
  clientId: string;
  fromOfficeId: string;
  toOfficeId: string;
  purpose: ReferralPurpose;
  realEstateId: string | null;
  message: string;
  status: ReferralStatus;
  createdAt: string;
  updatedAt: string;
};

export type Consent = {
  id: string;
  referralId: string;
  clientId: string;
  scopes: ConsentScope[];
  method: "in_meeting" | "email_link";
  grantedAt: string;
  revokedAt: string | null;
};

export type DirectoryOffice = {
  id: string;
  name: string;
  type: OfficeType;
  area: { prefecture: string; city: string };
  specialties: string[];
};

export type ExclusiveSlot = { prefecture: string; city: string; officeId: string };

export const PURPOSE_LABELS: Record<ReferralPurpose, string> = {
  sale: "不動産の売却",
  registration: "登記（相続登記・売買の登記）",
  inheritance_tax: "相続税の申告・相談",
  gift: "生前贈与の相談",
  transfer_tax: "譲渡所得の申告",
  other: "その他",
};

/** 目的ごとに、紹介先になる事務所の種別。「その他」はすべて。 */
export const PURPOSE_OFFICE_TYPE: Record<ReferralPurpose, OfficeType | null> = {
  sale: "real_estate",
  registration: "judicial_scrivener",
  inheritance_tax: "tax_accountant",
  gift: "tax_accountant",
  transfer_tax: "tax_accountant",
  other: null,
};

export const STATUS_LABELS: Record<ReferralStatus, string> = {
  awaiting_consent: "お客さまの同意待ち",
  sent: "返事待ち",
  accepted: "受諾",
  declined: "辞退",
  in_progress: "対応中",
  won: "受任・成約",
  lost: "不成立",
  withdrawn: "取り下げ",
};

export const SCOPE_LABELS: Record<ConsentScope, { label: string; detail: string }> = {
  basic: { label: "お名前と年齢", detail: "お名前、生まれた年" },
  family: { label: "ご家族", detail: "配偶者の有無、お子さまの人数" },
  real_estate: { label: "不動産", detail: "所在地、種類、時価の目安、方針" },
  financial: { label: "預貯金・収支", detail: "預貯金、証券、保険、負債、年金、生活費" },
  simulation: { label: "計画のすべて", detail: "上のすべてと、使い切りの計画（シミュレーション）" },
};

/** 目的ごとに、最初にチェックを入れておく範囲（必要最小限）。 */
export const DEFAULT_SCOPES: Record<ReferralPurpose, ConsentScope[]> = {
  sale: ["basic", "real_estate"],
  registration: ["basic", "family", "real_estate"],
  inheritance_tax: ["basic", "family", "real_estate", "financial"],
  gift: ["basic", "family", "financial"],
  transfer_tax: ["basic", "real_estate"],
  other: ["basic"],
};

/**
 * 紹介先の候補。目的に合う種別で、物件（または顧客）のエリアに対応する承認済みの事務所。
 * 不動産会社はエリア独占枠があれば、その1社だけを候補にする。自分の事務所は除く。
 */
export function candidateOffices(
  offices: DirectoryOffice[],
  slots: ExclusiveSlot[],
  purpose: ReferralPurpose,
  area: { prefecture: string; city: string },
  myOfficeId: string,
): { offices: DirectoryOffice[]; exclusive: boolean } {
  const type = PURPOSE_OFFICE_TYPE[purpose];
  const inArea = offices.filter(
    (o) => o.id !== myOfficeId && (type === null || o.type === type) && o.area.prefecture === area.prefecture && o.area.city === area.city,
  );
  if (type === "real_estate") {
    const slot = slots.find((s) => s.prefecture === area.prefecture && s.city === area.city);
    const holder = slot && inArea.find((o) => o.id === slot.officeId);
    if (holder) return { offices: [holder], exclusive: true };
  }
  return { offices: inArea, exclusive: false };
}

/** 送った側・受けた側それぞれに許されたステータスの変更（DB のトリガーと同じ）。 */
export function canChangeStatus(side: "from" | "to", current: ReferralStatus, next: ReferralStatus): boolean {
  if (side === "from") return next === "withdrawn" && ["awaiting_consent", "sent", "declined"].includes(current);
  if (current === "sent") return next === "accepted" || next === "declined";
  if (current === "accepted" || current === "in_progress") return ["in_progress", "won", "lost"].includes(next);
  return false;
}

/** 受けた側が次に選べるステータス。 */
export const nextStatusesFor = (side: "from" | "to", current: ReferralStatus) =>
  (Object.keys(STATUS_LABELS) as ReferralStatus[]).filter((s) => s !== current && canChangeStatus(side, current, s));

/** 受けた側がデータを読めるか：受諾済みで、有効な同意がある間だけ。 */
export const canReadClientData = (status: ReferralStatus, consent: Consent | undefined) =>
  ["accepted", "in_progress", "won", "lost"].includes(status) && !!consent && consent.revokedAt === null;

/** 「不動産」の範囲で渡す不動産。対象が決まっていればその1件、なければすべて。 */
export const sharedRealEstates = (plan: ClientPlan, realEstateId: string | null) =>
  realEstateId ? plan.realEstates.filter((r) => r.id === realEstateId) : plan.realEstates;

export type ScopedClientData = Partial<ClientPlan> & { scopes: ConsentScope[]; plan?: ClientPlan };

/**
 * 同意した範囲だけを取り出す（DB の referral_client_data() と同じ）。
 * 紹介の対象の不動産が決まっていれば、「不動産」で渡すのはその1件だけ（自宅など、ほかの不動産は渡さない）。
 */
export function scopeClientData(plan: ClientPlan, scopes: ConsentScope[], realEstateId: string | null = null): ScopedClientData {
  const out: ScopedClientData = { scopes };
  if (scopes.includes("basic")) Object.assign(out, { name: plan.name, birthYear: plan.birthYear });
  if (scopes.includes("family")) Object.assign(out, { hasSpouse: plan.hasSpouse, childrenCount: plan.childrenCount });
  if (scopes.includes("real_estate")) Object.assign(out, { realEstates: sharedRealEstates(plan, realEstateId) });
  if (scopes.includes("financial")) {
    Object.assign(out, {
      cash: plan.cash,
      securities: plan.securities,
      deathBenefit: plan.deathBenefit,
      liabilities: plan.liabilities,
      pensionMonthly: plan.pensionMonthly,
      monthlyLivingCost: plan.monthlyLivingCost,
    });
  }
  if (scopes.includes("simulation")) out.plan = plan;
  return out;
}
