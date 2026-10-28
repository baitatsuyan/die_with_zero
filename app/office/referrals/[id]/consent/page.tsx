"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { POLICY_LABELS } from "@/lib/clientPlan";
import { formatMan } from "@/lib/format";
import { changeReferralStatus, findOffice, grantConsent, OFFICE_TYPE_LABELS, useOfficeStore } from "@/lib/office/store";
import { DEFAULT_SCOPES, PURPOSE_LABELS, SCOPE_LABELS, sharedRealEstates, type ConsentScope } from "@/lib/referrals";

const SCOPES = Object.keys(SCOPE_LABELS) as ConsentScope[];

/** 紹介への同意（面談中に、お客さまご本人に画面で確認していただく）。 */
export default function ConsentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { office, clients, network } = useOfficeStore();
  const referral = network.referrals.find((r) => r.id === id);
  const client = clients.find((c) => c.id === referral?.clientId);
  const [scopes, setScopes] = useState<ConsentScope[] | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  if (!referral || !client || !office || referral.fromOfficeId !== office.id) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream p-6">
        <Link href="/office/referrals" className="text-xl font-bold text-pine">
          ← 紹介の一覧へ
        </Link>
      </main>
    );
  }

  const plan = client.plan;
  const to = findOffice(network, referral.toOfficeId, office);
  const property = plan.realEstates.find((r) => r.id === referral.realEstateId);
  const chosen = scopes ?? DEFAULT_SCOPES[referral.purpose];
  const toggle = (s: ConsentScope) => setScopes(chosen.includes(s) ? chosen.filter((x) => x !== s) : [...chosen, s]);
  const done = referral.status !== "awaiting_consent";

  return (
    <div className="min-h-screen bg-cream text-lg md:text-xl">
      <header className="flex items-center justify-between gap-4 px-6 py-4">
        <p className="text-base font-bold text-muted">{plan.name} 様へのご確認</p>
        <Link href={`/office/clients/${client.id}`} className="rounded-full border border-line bg-white px-5 py-2 text-base font-bold text-muted">
          閉じる
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 pb-12">
        <h1 className="text-3xl leading-snug font-bold md:text-4xl">次の事務所をご紹介してもよろしいですか</h1>

        <section className="mt-8 rounded-3xl bg-white p-6">
          <p className="text-base text-muted">ご紹介する事務所</p>
          <p className="mt-1 text-2xl font-bold">{to?.name ?? "（事務所）"}</p>
          {to && (
            <p className="text-base text-muted">
              {OFFICE_TYPE_LABELS[to.type]}・{to.area.prefecture}
              {to.area.city}
            </p>
          )}
          <p className="mt-4 text-base text-muted">ご相談の内容</p>
          <p className="font-bold">
            {PURPOSE_LABELS[referral.purpose]}
            {property && `（${property.label}：${property.prefecture}${property.city}${property.district}）`}
          </p>
          {referral.message && (
            <>
              <p className="mt-4 text-base text-muted">{office.name}からのひとこと</p>
              <p className="whitespace-pre-wrap">{referral.message}</p>
            </>
          )}
        </section>

        <section className="mt-6 rounded-3xl bg-white p-6">
          <h2 className="text-2xl font-bold">この事務所に渡す情報</h2>
          <p className="mt-1 text-base text-muted">チェックを入れた情報だけを渡します。外すこともできます。</p>
          <div className="mt-4 space-y-3">
            {SCOPES.map((s) => (
              <label key={s} className={`flex cursor-pointer gap-4 rounded-2xl border-2 p-4 ${chosen.includes(s) ? "border-pine bg-pine-soft" : "border-line"}`}>
                <input type="checkbox" className="mt-1.5 h-6 w-6 shrink-0 accent-pine" checked={chosen.includes(s)} onChange={() => toggle(s)} disabled={done} />
                <span>
                  <span className="block font-bold">{SCOPE_LABELS[s].label}</span>
                  <span className="block text-base text-muted">{SCOPE_LABELS[s].detail}</span>
                  {s === "real_estate" && chosen.includes(s) && sharedRealEstates(plan, referral.realEstateId).length > 0 && (
                    <span className="mt-1 block text-base">
                      {sharedRealEstates(plan, referral.realEstateId)
                        .map((r) => `${r.label}（${formatMan(r.value)}・${POLICY_LABELS[r.policy]}）`)
                        .join("、")}
                      {referral.realEstateId && plan.realEstates.length > 1 && "だけを渡します（ほかの不動産は渡しません）"}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </section>

        <ul className="mt-6 list-disc space-y-1 pl-6 text-base text-muted">
          <li>使い切りプランナーは紹介料を受け取りません。紹介先への相談をするかどうかは、ご自由にお決めいただけます。</li>
          <li>同意は、いつでも{office.name}を通じて取り消せます。取り消すと、紹介先はすぐに情報を見られなくなります。</li>
        </ul>

        {error && (
          <p className="mt-4 rounded-2xl bg-sun-soft p-4 font-bold text-alert" role="alert">
            記録できませんでした：{error}
          </p>
        )}

        {done ? (
          <p className="mt-8 rounded-3xl bg-pine p-6 font-bold text-white" role="status">
            ご同意を記録しました。{to?.name}に紹介をお送りしました。
          </p>
        ) : (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={chosen.length === 0 || sending}
              onClick={async () => {
                setSending(true);
                setError("");
                try {
                  await grantConsent(referral.id, chosen);
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                } finally {
                  setSending(false);
                }
              }}
              className="flex-1 rounded-full bg-sun px-8 py-5 text-xl font-bold text-ink shadow-md disabled:opacity-50"
            >
              {sending ? "記録しています…" : "同意して紹介してもらう"}
            </button>
            <button
              type="button"
              onClick={async () => {
                await changeReferralStatus(referral.id, "withdrawn");
                router.push(`/office/clients/${client.id}`);
              }}
              className="rounded-full border-2 border-line bg-white px-8 py-5 text-xl font-bold"
            >
              今回は紹介しない
            </button>
          </div>
        )}
        {done && (
          <Link href={`/office/clients/${client.id}`} className="mt-4 inline-block font-bold text-pine">
            {plan.name} 様の画面へ戻る →
          </Link>
        )}
      </main>
    </div>
  );
}
