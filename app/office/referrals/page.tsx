"use client";

import Link from "next/link";
import { useState } from "react";
import { findOffice, useOfficeStore } from "@/lib/office/store";
import { PURPOSE_LABELS, STATUS_LABELS, type Referral, type ReferralStatus } from "@/lib/referrals";

const STATUS_STYLE: Partial<Record<ReferralStatus, string>> = {
  awaiting_consent: "bg-sun-soft text-alert",
  sent: "bg-sun-soft text-ink",
  accepted: "bg-pine-soft text-pine",
  in_progress: "bg-pine-soft text-pine",
  won: "bg-pine text-white",
};

/** 紹介の受信箱と、送った紹介。件数は見える化のためだけ（料金には使わない）。 */
export default function ReferralsPage() {
  const { office, clients, network } = useOfficeStore();
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  if (!office) return null;

  const inbox = network.referrals.filter((r) => r.toOfficeId === office.id);
  const sent = network.referrals.filter((r) => r.fromOfficeId === office.id);
  const waiting = inbox.filter((r) => r.status === "sent").length;
  const list = (tab === "inbox" ? inbox : sent).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const label = (r: Referral) => {
    if (tab === "sent") return clients.find((c) => c.id === r.clientId)?.plan.name ?? "お客さま";
    return ["accepted", "in_progress", "won", "lost"].includes(r.status) ? "（詳細で表示）" : "（受諾すると表示されます）";
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
      <h1 className="text-2xl font-bold md:text-3xl">紹介</h1>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "受け取った紹介", value: inbox.length },
          { label: "返事待ち", value: waiting, strong: waiting > 0 },
          { label: "送った紹介", value: sent.length },
          { label: "受任・成約（送った分）", value: sent.filter((r) => r.status === "won").length },
        ].map((k) => (
          <div key={k.label} className={`rounded-2xl border p-4 ${k.strong ? "border-sun bg-sun-soft" : "border-line bg-white"}`}>
            <dt className="text-xs font-bold text-muted">{k.label}</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{k.value}件</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-muted">紹介は無料です。件数は料金に関係しません。</p>

      <div className="mt-6 flex gap-2" role="tablist">
        {(
          [
            ["inbox", `受け取った紹介（${inbox.length}）`],
            ["sent", `送った紹介（${sent.length}）`],
          ] as const
        ).map(([t, l]) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-full border px-5 py-2 text-sm font-bold ${tab === t ? "border-pine bg-pine text-white" : "border-line bg-white"}`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[40rem] text-left">
          <thead className="text-sm text-muted">
            <tr className="border-b border-line">
              <th className="px-5 py-3 font-normal">{tab === "inbox" ? "紹介元" : "紹介先"}</th>
              <th className="px-5 py-3 font-normal">お客さま</th>
              <th className="px-5 py-3 font-normal">目的</th>
              <th className="px-5 py-3 font-normal">状況</th>
              <th className="px-5 py-3 font-normal">更新</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const other = findOffice(network, tab === "inbox" ? r.fromOfficeId : r.toOfficeId, office);
              return (
                <tr key={r.id} className="border-b border-line/60 last:border-0 hover:bg-cream/60">
                  <td className="px-5 py-4">
                    <Link href={`/office/referrals/${r.id}`} className="font-bold text-pine hover:underline">
                      {other?.name ?? "（事務所）"}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-sm">{label(r)}</td>
                  <td className="px-5 py-4 text-sm">{PURPOSE_LABELS[r.purpose]}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLE[r.status] ?? "bg-cream text-muted"}`}>{STATUS_LABELS[r.status]}</span>
                  </td>
                  <td className="px-5 py-4 text-sm whitespace-nowrap text-muted">{new Date(r.updatedAt).toLocaleDateString("ja-JP")}</td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-muted">
                  {tab === "inbox" ? "まだ紹介は届いていません。" : "まだ紹介を送っていません。顧客の画面の「紹介する」から送れます。"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
