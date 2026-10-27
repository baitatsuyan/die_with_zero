"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { BalanceChart } from "@/components/BalanceChart";
import { ClientEditor } from "@/components/office/ClientEditor";
import { nextActions, summarizePlan } from "@/lib/clientPlan";
import { formatMan } from "@/lib/format";
import { CLIENT_STATUS_LABELS, deleteClient, updateClient, useOfficeStore, type ClientStatus } from "@/lib/office/store";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { clients } = useOfficeStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const client = clients.find((c) => c.id === id);

  if (!client) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <p className="text-muted">このお客さまは見つかりませんでした。</p>
        <Link href="/office/clients" className="mt-4 inline-block font-bold text-pine">
          ← 顧客一覧へ
        </Link>
      </main>
    );
  }

  const plan = client.plan;
  const s = summarizePlan(plan);
  const d = s.diagnosis;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
      <Link href="/office/clients" className="text-sm font-bold text-pine hover:underline">
        ← 顧客一覧
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold md:text-3xl">{plan.name} 様</h1>
          <select
            aria-label="ステータス"
            value={client.status}
            onChange={(e) => updateClient(client.id, { status: e.target.value as ClientStatus })}
            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-bold"
          >
            {Object.entries(CLIENT_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/office/clients/${client.id}/meeting`} className="rounded-full bg-sun px-6 py-3 font-bold text-ink shadow-sm hover:brightness-105">
            面談モードで見せる
          </Link>
          <Link href={`/office/clients/${client.id}/proposal`} className="rounded-full border-2 border-pine px-6 py-3 font-bold text-pine hover:bg-pine-soft">
            提案書をつくる
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="min-w-0">
          <ClientEditor plan={plan} onChange={(next) => updateClient(client.id, { plan: next })} />
          <div className="mt-6">
            {confirmDelete ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-sun-soft p-4 text-sm">
                <span className="font-bold">{plan.name} 様のデータを削除します。元に戻せません。</span>
                <button
                  type="button"
                  onClick={() => {
                    deleteClient(client.id);
                    router.push("/office/clients");
                  }}
                  className="rounded-full bg-alert px-4 py-2 font-bold text-white"
                >
                  削除する
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="font-bold text-muted">
                  やめる
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="text-sm font-bold text-alert hover:underline">
                このお客さまを削除
              </button>
            )}
          </div>
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-2xl bg-pine p-5 text-white">
            <p className="text-sm font-bold text-white/80">毎年あと使える額</p>
            <p className="mt-1 text-4xl font-bold tabular-nums">{formatMan(d.extraAnnualSpend)}</p>
            {d.saleAge !== null && <p className="mt-2 text-sm text-sun-soft">不動産は{d.saleAge}歳までに売却（{d.cashRunOutAge}歳ごろ預貯金が残しておきたい額を下回るため）</p>}
            {d.extraAnnualSpend === 0 && d.depletionAge !== null && <p className="mt-2 text-sm text-sun-soft">{d.depletionAge}歳ごろに資産が尽きる見込み</p>}
            <div className="mt-4 rounded-xl bg-white p-2">
              <BalanceChart path={d.path} plannedPath={d.plannedPath} safetyMargin={plan.safetyMargin} saleAge={d.extraAnnualSpend > 0 ? d.saleAge : null} />
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-line bg-white p-4">
              <dt className="text-muted">純資産（不動産込み）</dt>
              <dd className="mt-1 text-xl font-bold tabular-nums">{formatMan(s.netWorth)}</dd>
            </div>
            <div className="rounded-2xl border border-line bg-white p-4">
              <dt className="text-muted">相続税の目安（いま）</dt>
              <dd className="mt-1 text-xl font-bold tabular-nums">{s.taxNow.payableTax > 0 ? formatMan(s.taxNow.payableTax) : "かからない見込み"}</dd>
            </div>
          </dl>
          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="font-bold">次にやること</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
              {nextActions(plan, s).map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ol>
          </div>
          <p className="text-xs text-muted">※ 概算です。相続税は不動産の時価で計算した保守的な目安です。</p>
        </aside>
      </div>
    </main>
  );
}
