"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fieldClass } from "@/components/office/Field";
import { summarizePlan } from "@/lib/clientPlan";
import { formatMan } from "@/lib/format";
import { sanitizeDigits } from "@/lib/numberText";
import { addClient, CLIENT_STATUS_LABELS, useOfficeStore, type ClientStatus } from "@/lib/office/store";

const STATUSES = Object.keys(CLIENT_STATUS_LABELS) as ClientStatus[];

export default function ClientsPage() {
  const { clients } = useOfficeStore();
  const router = useRouter();
  const [filter, setFilter] = useState<ClientStatus | "all">("all");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const thisYear = new Date().getFullYear();
  const birthYearNum = Number(birthYear);
  const canAdd = name.trim() !== "" && birthYearNum >= thisYear - 110 && birthYearNum <= thisYear - 20;

  const shown = [...clients]
    .filter((c) => filter === "all" || c.status === filter)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">顧客一覧</h1>
          <p className="mt-1 text-sm text-muted">{clients.length}人のお客さま</p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-full bg-sun px-6 py-3 font-bold text-ink shadow-sm transition hover:brightness-105"
        >
          ＋ 顧客を追加
        </button>
      </div>

      {adding && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!canAdd) return;
            const id = addClient(name.trim(), birthYearNum);
            router.push(`/office/clients/${id}`);
          }}
          className="mt-6 grid gap-4 rounded-2xl border border-line bg-white p-5 sm:grid-cols-[1fr_12rem_auto] sm:items-end"
        >
          <div>
            <label htmlFor="new-name" className="text-sm font-bold">
              お名前
            </label>
            <input id="new-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus className={`mt-1 ${fieldClass}`} />
          </div>
          <div>
            <label htmlFor="new-birth" className="text-sm font-bold">
              生まれた年（西暦）
            </label>
            <input
              id="new-birth"
              inputMode="numeric"
              value={birthYear}
              onChange={(e) => setBirthYear(sanitizeDigits(e.target.value))}
              placeholder="1958"
              className={`mt-1 ${fieldClass} tabular-nums`}
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={!canAdd} className="rounded-full bg-pine px-6 py-3 font-bold text-white disabled:opacity-40">
              追加して入力へ
            </button>
            <button type="button" onClick={() => setAdding(false)} className="rounded-full px-4 py-3 font-bold text-muted">
              やめる
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="ステータスで絞り込む">
        {(["all", ...STATUSES] as const).map((s) => {
          const count = s === "all" ? clients.length : clients.filter((c) => c.status === s).length;
          return (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={filter === s}
              onClick={() => setFilter(s)}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                filter === s ? "border-pine bg-pine text-white" : "border-line bg-white text-ink hover:border-pine"
              }`}
            >
              {s === "all" ? "すべて" : CLIENT_STATUS_LABELS[s]}
              <span className="ml-1.5 tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[44rem] text-left">
          <thead className="text-sm text-muted">
            <tr className="border-b border-line">
              <th className="px-5 py-3 font-normal">お名前</th>
              <th className="px-5 py-3 font-normal">ステータス</th>
              <th className="px-5 py-3 text-right font-normal">純資産</th>
              <th className="px-5 py-3 text-right font-normal">毎年あと使える額</th>
              <th className="px-5 py-3 font-normal">気になる点</th>
              <th className="px-5 py-3 font-normal">更新</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => {
              const s = summarizePlan(c.plan);
              return (
                <tr key={c.id} className="border-b border-line/60 last:border-0 hover:bg-cream/60">
                  <td className="px-5 py-4">
                    <Link href={`/office/clients/${c.id}`} className="font-bold text-pine hover:underline">
                      {c.plan.name}
                    </Link>
                    <span className="block text-xs text-muted">{s.age}歳</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-pine-soft px-3 py-1 text-xs font-bold text-pine">{CLIENT_STATUS_LABELS[c.status]}</span>
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums">{formatMan(s.netWorth)}</td>
                  <td className="px-5 py-4 text-right font-bold tabular-nums">{formatMan(s.diagnosis.extraAnnualSpend)}</td>
                  <td className="px-5 py-4 text-sm">
                    {s.undecidedCount > 0 && <span className="mr-2 rounded bg-sun-soft px-2 py-0.5 text-alert">方針未定の不動産 {s.undecidedCount}件</span>}
                    {s.diagnosis.saleAge !== null && <span className="mr-2 text-muted">{s.diagnosis.saleAge}歳までに売却</span>}
                    {s.taxNow.payableTax > 0 && <span className="text-muted">相続税あり</span>}
                  </td>
                  <td className="px-5 py-4 text-sm whitespace-nowrap text-muted">{new Date(c.updatedAt).toLocaleDateString("ja-JP")}</td>
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-muted">
                  このステータスのお客さまはいません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
