"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { fieldClass } from "@/components/office/Field";
import { POLICY_LABELS } from "@/lib/clientPlan";
import { formatMan } from "@/lib/format";
import { createReferral, OFFICE_TYPE_LABELS, useOfficeStore } from "@/lib/office/store";
import { candidateOffices, PURPOSE_LABELS, PURPOSE_OFFICE_TYPE, type ReferralPurpose } from "@/lib/referrals";

const PURPOSES = Object.keys(PURPOSE_LABELS) as ReferralPurpose[];

/** 紹介を作る：目的と不動産を選び、エリアと種別に合う参加事務所から紹介先を選ぶ。 */
export default function ReferPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { office, clients, network } = useOfficeStore();
  const client = clients.find((c) => c.id === id);
  const [purpose, setPurpose] = useState<ReferralPurpose>("sale");
  const [realEstateId, setRealEstateId] = useState<string | null>(client?.plan.realEstates[0]?.id ?? null);
  const [toOfficeId, setToOfficeId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  if (!client || !office) return null;
  const plan = client.plan;
  const property = plan.realEstates.find((r) => r.id === realEstateId) ?? null;
  // 紹介先の候補は、物件の所在地で絞る（物件がなければ自分の事務所のエリア）
  const area = property ? { prefecture: property.prefecture, city: property.city } : office.area;
  const { offices: candidates, exclusive } = candidateOffices(network.directory, network.slots, purpose, area, office.id);
  const selected = candidates.find((o) => o.id === toOfficeId) ?? null;
  const type = PURPOSE_OFFICE_TYPE[purpose];

  const submit = async () => {
    if (!selected) return;
    setSending(true);
    setError("");
    try {
      const referralId = await createReferral({ clientId: client.id, toOfficeId: selected.id, purpose, realEstateId: property?.id ?? null, message: message.trim() });
      router.push(`/office/referrals/${referralId}/consent`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSending(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-10">
      <Link href={`/office/clients/${client.id}`} className="text-sm font-bold text-pine hover:underline">
        ← {plan.name} 様の画面
      </Link>
      <h1 className="mt-3 text-2xl font-bold md:text-3xl">{plan.name} 様を紹介する</h1>
      <p className="mt-2 text-sm text-muted">紹介は無料です。送る前に、お客さまに「どの事務所に、どの情報を渡すか」を確認して同意をいただきます。</p>

      <section className="mt-8 rounded-2xl border border-line bg-white p-5 md:p-6">
        <h2 className="font-bold">1. 紹介の目的</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {PURPOSES.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={purpose === p}
              onClick={() => {
                setPurpose(p);
                setToOfficeId(null);
              }}
              className={`rounded-full border px-4 py-2 text-sm font-bold ${purpose === p ? "border-pine bg-pine text-white" : "border-line"}`}
            >
              {PURPOSE_LABELS[p]}
            </button>
          ))}
        </div>
      </section>

      {plan.realEstates.length > 0 && (
        <section className="mt-4 rounded-2xl border border-line bg-white p-5 md:p-6">
          <h2 className="font-bold">2. 対象の不動産</h2>
          <p className="mt-1 text-sm text-muted">紹介先は、物件の所在地に対応している事務所から選びます。</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {plan.realEstates.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={realEstateId === r.id}
                onClick={() => {
                  setRealEstateId(r.id);
                  setToOfficeId(null);
                }}
                className={`rounded-xl border p-4 text-left ${realEstateId === r.id ? "border-pine bg-pine-soft" : "border-line"}`}
              >
                <span className="block font-bold">{r.label}</span>
                <span className="block text-sm text-muted">
                  {r.prefecture}
                  {r.city}
                  {r.district}・{formatMan(r.value)}・{POLICY_LABELS[r.policy]}
                </span>
              </button>
            ))}
            <button
              type="button"
              aria-pressed={realEstateId === null}
              onClick={() => {
                setRealEstateId(null);
                setToOfficeId(null);
              }}
              className={`rounded-xl border p-4 text-left ${realEstateId === null ? "border-pine bg-pine-soft" : "border-line"}`}
            >
              <span className="block font-bold">不動産は指定しない</span>
              <span className="block text-sm text-muted">事務所と同じエリア（{office.area.prefecture}{office.area.city}）で探す</span>
            </button>
          </div>
        </section>
      )}

      <section className="mt-4 rounded-2xl border border-line bg-white p-5 md:p-6">
        <h2 className="font-bold">3. 紹介先</h2>
        <p className="mt-1 text-sm text-muted">
          {area.prefecture}
          {area.city}の{type ? OFFICE_TYPE_LABELS[type] : "参加事務所"}
          {exclusive && "（このエリアの不動産会社は、エリア独占枠の1社です）"}
        </p>
        <div className="mt-3 grid gap-2">
          {candidates.length === 0 && (
            <p className="rounded-xl bg-cream p-4 text-sm text-muted">このエリアには、まだ紹介できる参加事務所がありません。</p>
          )}
          {candidates.map((o) => (
            <label key={o.id} className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${toOfficeId === o.id ? "border-pine bg-pine-soft" : "border-line"}`}>
              <input type="radio" name="to-office" className="mt-1.5 accent-pine" checked={toOfficeId === o.id} onChange={() => setToOfficeId(o.id)} />
              <span>
                <span className="block font-bold">{o.name}</span>
                <span className="block text-sm text-muted">
                  {OFFICE_TYPE_LABELS[o.type]}
                  {o.specialties.length > 0 && `・得意分野：${o.specialties.join("、")}`}
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-white p-5 md:p-6">
        <label htmlFor="referral-message" className="font-bold">
          4. 紹介先へのひとこと（任意）
        </label>
        <textarea
          id="referral-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="例：ご長男が売却に前向きです。まずは査定のご連絡をお願いします。"
          className={`mt-2 ${fieldClass} font-normal`}
        />
        <p className="mt-1 text-xs text-muted">お客さまの同意の画面にも表示されます。</p>
      </section>

      {error && (
        <p className="mt-4 rounded-xl bg-sun-soft p-3 text-sm font-bold text-alert" role="alert">
          紹介を作れませんでした：{error}
        </p>
      )}
      <div className="mt-6 flex justify-end">
        <button type="button" onClick={submit} disabled={!selected || sending} className="rounded-full bg-sun px-8 py-4 font-bold text-ink shadow-sm disabled:opacity-50">
          {sending ? "準備しています…" : "お客さまに同意をいただく →"}
        </button>
      </div>
    </main>
  );
}
