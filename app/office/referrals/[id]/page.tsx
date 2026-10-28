"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { POLICY_LABELS, summarizePlan, USE_LABELS } from "@/lib/clientPlan";
import { formatMan } from "@/lib/format";
import { changeReferralStatus, fetchReferredClient, findOffice, OFFICE_TYPE_LABELS, revokeConsent, useOfficeStore } from "@/lib/office/store";
import { canReadClientData, nextStatusesFor, PURPOSE_LABELS, SCOPE_LABELS, STATUS_LABELS, type ReferralStatus, type ScopedClientData } from "@/lib/referrals";

const ACTION_LABELS: Partial<Record<ReferralStatus, string>> = {
  accepted: "受諾する",
  declined: "辞退する",
  in_progress: "対応中にする",
  won: "受任・成約にする",
  lost: "不成立にする",
  withdrawn: "紹介を取り下げる",
};

export default function ReferralDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { office, clients, network } = useOfficeStore();
  const referral = network.referrals.find((r) => r.id === id);
  const consent = network.consents.find((c) => c.referralId === id && c.revokedAt === null) ?? network.consents.find((c) => c.referralId === id);
  const [data, setData] = useState<ScopedClientData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const side = referral && office ? (referral.fromOfficeId === office.id ? "from" : "to") : null;
  const readable = !!referral && side === "to" && canReadClientData(referral.status, consent);

  // 受けた側は、受諾後・同意が有効な間だけ、同意された範囲のデータを読む
  useEffect(() => {
    let cancelled = false;
    if (!readable) {
      setData(null);
      return;
    }
    fetchReferredClient(id)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [id, readable, referral?.status, consent?.revokedAt]);

  if (!referral || !office || !side) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 md:px-6">
        <p className="text-muted">この紹介は見つかりませんでした。</p>
        <Link href="/office/referrals" className="mt-4 inline-block font-bold text-pine">
          ← 紹介の一覧へ
        </Link>
      </main>
    );
  }

  const from = findOffice(network, referral.fromOfficeId, office);
  const to = findOffice(network, referral.toOfficeId, office);
  const ownClient = side === "from" ? clients.find((c) => c.id === referral.clientId) : undefined;
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-10">
      <Link href="/office/referrals" className="text-sm font-bold text-pine hover:underline">
        ← 紹介の一覧
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold md:text-3xl">{PURPOSE_LABELS[referral.purpose]}の紹介</h1>
        <span className="rounded-full bg-pine-soft px-3 py-1 text-sm font-bold text-pine">{STATUS_LABELS[referral.status]}</span>
      </div>

      <dl className="mt-6 grid gap-3 rounded-2xl border border-line bg-white p-5 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-bold text-muted">紹介元</dt>
          <dd className="font-bold">{from?.name}</dd>
          {from && <dd className="text-sm text-muted">{OFFICE_TYPE_LABELS[from.type]}</dd>}
        </div>
        <div>
          <dt className="text-xs font-bold text-muted">紹介先</dt>
          <dd className="font-bold">{to?.name}</dd>
          {to && <dd className="text-sm text-muted">{OFFICE_TYPE_LABELS[to.type]}</dd>}
        </div>
        {ownClient && (
          <div>
            <dt className="text-xs font-bold text-muted">お客さま</dt>
            <dd>
              <Link href={`/office/clients/${ownClient.id}`} className="font-bold text-pine hover:underline">
                {ownClient.plan.name} 様
              </Link>
            </dd>
          </div>
        )}
        <div>
          <dt className="text-xs font-bold text-muted">お客さまの同意</dt>
          <dd className="text-sm">
            {!consent && "まだいただいていません"}
            {consent && consent.revokedAt === null && `${new Date(consent.grantedAt).toLocaleDateString("ja-JP")}に同意（${consent.scopes.map((s) => SCOPE_LABELS[s].label).join("・")}）`}
            {consent && consent.revokedAt !== null && `${new Date(consent.revokedAt).toLocaleDateString("ja-JP")}に取り消し`}
          </dd>
        </div>
        {referral.message && (
          <div className="sm:col-span-2">
            <dt className="text-xs font-bold text-muted">紹介元からのひとこと</dt>
            <dd className="text-sm whitespace-pre-wrap">{referral.message}</dd>
          </div>
        )}
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        {side === "from" && referral.status === "awaiting_consent" && (
          <Link href={`/office/referrals/${referral.id}/consent`} className="rounded-full bg-sun px-6 py-3 font-bold text-ink">
            お客さまに同意をいただく
          </Link>
        )}
        {nextStatusesFor(side, referral.status).map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy}
            onClick={() => run(() => changeReferralStatus(referral.id, s))}
            className={`rounded-full px-6 py-3 font-bold disabled:opacity-50 ${
              s === "accepted" || s === "won" ? "bg-pine text-white" : "border border-line bg-white text-ink"
            }`}
          >
            {ACTION_LABELS[s]}
          </button>
        ))}
        {side === "from" && consent && consent.revokedAt === null && (
          <button type="button" disabled={busy} onClick={() => run(() => revokeConsent(referral.id))} className="rounded-full border border-alert px-6 py-3 font-bold text-alert disabled:opacity-50">
            お客さまの同意を取り消す
          </button>
        )}
      </div>
      {error && (
        <p className="mt-3 rounded-xl bg-sun-soft p-3 text-sm font-bold text-alert" role="alert">
          {error}
        </p>
      )}

      {side === "to" && (
        <section className="mt-8">
          <h2 className="text-lg font-bold">お客さまの情報</h2>
          {referral.status === "sent" && <p className="mt-2 rounded-xl bg-cream p-4 text-sm text-muted">受諾すると、お客さまが同意した範囲の情報が表示されます。</p>}
          {["declined", "withdrawn"].includes(referral.status) && <p className="mt-2 rounded-xl bg-cream p-4 text-sm text-muted">この紹介は終了しています。</p>}
          {!readable && consent?.revokedAt && <p className="mt-2 rounded-xl bg-sun-soft p-4 text-sm">お客さまが同意を取り消したため、情報は表示できません。</p>}
          {readable && data && <ClientDataView data={data} />}
        </section>
      )}
    </main>
  );
}

/** 同意された範囲だけのお客さまの情報。 */
function ClientDataView({ data }: { data: ScopedClientData }) {
  const year = new Date().getFullYear();
  const summary = data.plan ? summarizePlan(data.plan) : null;
  return (
    <div className="mt-3 space-y-4">
      <p className="text-xs text-muted">表示している範囲：{data.scopes.map((s) => SCOPE_LABELS[s].label).join("・")}</p>
      {(data.name || data.hasSpouse !== undefined) && (
        <div className="grid gap-3 rounded-2xl border border-line bg-white p-5 sm:grid-cols-3">
          {data.name && (
            <div>
              <p className="text-xs font-bold text-muted">お名前</p>
              <p className="text-lg font-bold">{data.name} 様</p>
              {data.birthYear && <p className="text-sm text-muted">{year - data.birthYear}歳</p>}
            </div>
          )}
          {data.hasSpouse !== undefined && (
            <div>
              <p className="text-xs font-bold text-muted">ご家族</p>
              <p>
                配偶者{data.hasSpouse ? "あり" : "なし"}・お子さま{data.childrenCount}人
              </p>
            </div>
          )}
        </div>
      )}
      {data.realEstates && data.realEstates.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white p-5">
          <p className="font-bold">不動産</p>
          <table className="mt-2 w-full min-w-[32rem] text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="py-2 font-normal">不動産</th>
                <th className="py-2 font-normal">所在地</th>
                <th className="py-2 font-normal">使い方</th>
                <th className="py-2 text-right font-normal">時価の目安</th>
                <th className="py-2 text-right font-normal">方針</th>
              </tr>
            </thead>
            <tbody>
              {data.realEstates.map((r) => (
                <tr key={r.id} className="border-b border-line/60 last:border-0">
                  <td className="py-2 font-bold">{r.label}</td>
                  <td className="py-2">
                    {r.prefecture}
                    {r.city}
                    {r.district}
                  </td>
                  <td className="py-2">{USE_LABELS[r.use]}</td>
                  <td className="py-2 text-right tabular-nums">{formatMan(r.value)}</td>
                  <td className="py-2 text-right font-bold">{POLICY_LABELS[r.policy]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data.cash !== undefined && (
        <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-line bg-white p-5 sm:grid-cols-3">
          {[
            ["預貯金", data.cash],
            ["証券", data.securities],
            ["死亡保険金", data.deathBenefit],
            ["負債", data.liabilities],
            ["年金（月額）", data.pensionMonthly],
            ["生活費（月額）", data.monthlyLivingCost],
          ].map(([l, v]) => (
            <div key={l as string}>
              <dt className="text-xs font-bold text-muted">{l}</dt>
              <dd className="font-bold tabular-nums">{formatMan(Number(v ?? 0))}</dd>
            </div>
          ))}
        </dl>
      )}
      {summary && (
        <div className="rounded-2xl bg-pine p-5 text-white">
          <p className="text-sm font-bold text-white/80">使い切りの計画</p>
          <p className="mt-1">
            毎年あと使える額 <strong className="text-2xl">{formatMan(summary.diagnosis.extraAnnualSpend)}</strong>
            {summary.diagnosis.saleAge !== null && `・不動産は${summary.diagnosis.saleAge}歳までに売却の見込み`}
          </p>
        </div>
      )}
    </div>
  );
}
