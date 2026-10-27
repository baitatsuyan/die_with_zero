"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BalanceChart } from "@/components/BalanceChart";
import { nextActions, POLICY_LABELS, summarizePlan, type ClientPlan, type PropertyPolicy } from "@/lib/clientPlan";
import { formatMan } from "@/lib/format";
import { updateClient, useOfficeStore } from "@/lib/office/store";

const SLIDES = ["いまの全体像", "毎年あと使える額", "不動産をどうするか", "相続税の目安", "次にやること"];

/** 面談モード：お客さまと並んで見る前提。1画面に1つの話題、大きな文字。 */
export default function MeetingPage() {
  const { id } = useParams<{ id: string }>();
  const { clients } = useOfficeStore();
  const client = clients.find((c) => c.id === id);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setSlide((n) => Math.min(SLIDES.length - 1, n + 1));
      if (e.key === "ArrowLeft") setSlide((n) => Math.max(0, n - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!client) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream p-6">
        <Link href="/office/clients" className="text-xl font-bold text-pine">
          ← 顧客一覧へ
        </Link>
      </main>
    );
  }

  const plan = client.plan;
  const s = summarizePlan(plan);
  const d = s.diagnosis;
  const update = (next: ClientPlan) => updateClient(client.id, { plan: next });

  return (
    <div className="flex min-h-screen flex-col bg-cream text-xl md:text-2xl">
      <header className="flex items-center justify-between gap-4 px-6 py-4">
        <p className="text-base font-bold text-muted md:text-lg">{plan.name} 様の人生後半の計画</p>
        <Link href={`/office/clients/${client.id}`} className="rounded-full border border-line bg-white px-5 py-2 text-base font-bold text-muted hover:text-pine">
          面談を終える
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-6">
        <p className="text-base font-bold tracking-widest text-pine md:text-lg">
          {slide + 1} / {SLIDES.length}
        </p>
        <h1 className="mt-1 text-4xl font-bold md:text-5xl">{SLIDES[slide]}</h1>

        <div className="mt-8 flex-1">
          {slide === 0 && <Overview plan={plan} netWorth={s.netWorth} />}

          {slide === 1 && (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)] lg:items-center">
              <div>
                <p className="leading-none font-bold text-pine">
                  <span className="text-7xl tabular-nums md:text-8xl">{Math.round(d.extraAnnualSpend).toLocaleString()}</span>
                  <span className="ml-2 text-3xl">万円</span>
                </p>
                <p className="mt-4 text-muted">
                  月にすると約{formatMan(d.extraAnnualSpend / 12)}。{plan.lifeExpectancy}歳で{formatMan(plan.safetyMargin)}が残る計算です。
                </p>
                <div className="mt-8">
                  <p className="text-lg font-bold">毎月の生活費：{formatMan(plan.monthlyLivingCost)}</p>
                  <div className="mt-3 flex gap-3">
                    <button type="button" onClick={() => update({ ...plan, monthlyLivingCost: Math.max(5, plan.monthlyLivingCost - 1) })} className="rounded-full border-2 border-pine px-6 py-3 text-lg font-bold text-pine">
                      1万円へらす
                    </button>
                    <button type="button" onClick={() => update({ ...plan, monthlyLivingCost: plan.monthlyLivingCost + 1 })} className="rounded-full border-2 border-pine px-6 py-3 text-lg font-bold text-pine">
                      1万円ふやす
                    </button>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl bg-white p-4">
                <BalanceChart path={d.path} plannedPath={d.plannedPath} safetyMargin={plan.safetyMargin} saleAge={d.extraAnnualSpend > 0 ? d.saleAge : null} />
              </div>
            </div>
          )}

          {slide === 2 && (
            <div className="space-y-5">
              {d.saleAge !== null && (
                <p className="rounded-3xl bg-sun-soft p-6 font-bold">
                  {d.cashRunOutAge}歳ごろに預貯金が、最期に残しておきたい額（{formatMan(plan.safetyMargin)}）を下回るため、<span className="text-alert">{d.saleAge}歳までに売却</span>するのが目安です。
                </p>
              )}
              {plan.realEstates.length === 0 && <p className="text-muted">登録されている不動産はありません。</p>}
              {plan.realEstates.map((r) => (
                <div key={r.id} className="rounded-3xl bg-white p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <p className="text-2xl font-bold md:text-3xl">{r.label}</p>
                    <p className="text-muted">
                      {r.city}
                      {r.district}・時価の目安 {formatMan(r.value)}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {(Object.keys(POLICY_LABELS) as PropertyPolicy[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        aria-pressed={r.policy === p}
                        onClick={() => update({ ...plan, realEstates: plan.realEstates.map((x) => (x.id === r.id ? { ...x, policy: p } : x)) })}
                        className={`rounded-full border-2 px-6 py-3 text-lg font-bold ${r.policy === p ? "border-pine bg-pine text-white" : "border-line bg-white"}`}
                      >
                        {POLICY_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-base text-muted">方針を変えると、毎年あと使える額もすぐに計算し直します（いま {formatMan(d.extraAnnualSpend)}／年）。</p>
            </div>
          )}

          {slide === 3 && (
            <div>
              {s.taxNow.payableTax > 0 ? (
                <p className="leading-none font-bold text-pine">
                  <span className="text-7xl tabular-nums md:text-8xl">{Math.round(s.taxNow.payableTax).toLocaleString()}</span>
                  <span className="ml-2 text-3xl">万円</span>
                </p>
              ) : (
                <p className="text-5xl font-bold text-pine md:text-6xl">かからない見込みです</p>
              )}
              <p className="mt-6 text-muted">
                いま相続が起きた場合の概算です。遺産の合計 {formatMan(s.taxNow.taxablePrice)}（負債などを差し引いた額）、基礎控除 {formatMan(s.taxNow.basicDeduction)}。
              </p>
              {s.taxNow.payableTax > 0 && (
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {s.taxNow.heirs.map((h, i) => (
                    <li key={i} className="flex justify-between rounded-2xl bg-white p-5">
                      <span className="font-bold">{h.role === "spouse" ? "配偶者" : h.role === "child" ? `お子さま${plan.hasSpouse ? i : i + 1}` : "相続人"}</span>
                      <span className="tabular-nums">{formatMan(h.tax)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-6 text-base text-muted">※ 不動産は時価で計算した保守的な目安です。実際の税額は、特例の使い方などにより変わります。</p>
            </div>
          )}

          {slide === 4 && (
            <ol className="space-y-4">
              {nextActions(plan, s).map((a, i) => (
                <li key={a} className="flex gap-5 rounded-3xl bg-white p-6">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-pine text-2xl font-bold text-white">{i + 1}</span>
                  <span className="pt-1.5 font-bold">{a}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <nav className="mt-10 flex items-center justify-between gap-4" aria-label="面談の画面送り">
          <button type="button" onClick={() => setSlide((n) => Math.max(0, n - 1))} disabled={slide === 0} className="rounded-full border-2 border-line bg-white px-8 py-4 font-bold disabled:opacity-30">
            ← 前へ
          </button>
          <div className="flex gap-2">
            {SLIDES.map((t, i) => (
              <button key={t} type="button" aria-label={t} aria-current={i === slide} onClick={() => setSlide(i)} className={`h-3 w-3 rounded-full ${i === slide ? "bg-pine" : "bg-line"}`} />
            ))}
          </div>
          {slide < SLIDES.length - 1 ? (
            <button type="button" onClick={() => setSlide((n) => n + 1)} className="rounded-full bg-sun px-8 py-4 font-bold text-ink">
              次へ →
            </button>
          ) : (
            <Link href={`/office/clients/${client.id}/proposal`} className="rounded-full bg-sun px-8 py-4 font-bold text-ink">
              提案書へ →
            </Link>
          )}
        </nav>
        <p className="mt-4 text-center text-sm text-muted">※ 試算はすべて概算です。</p>
      </main>
    </div>
  );
}

function Overview({ plan, netWorth }: { plan: ClientPlan; netWorth: number }) {
  const items = [
    { label: "預貯金", value: plan.cash, color: "bg-pine" },
    { label: "証券", value: plan.securities, color: "bg-pine/60" },
    ...plan.realEstates.map((r) => ({ label: r.label, value: r.value, color: "bg-sun" })),
  ].filter((i) => i.value > 0);
  const total = items.reduce((sum, i) => sum + i.value, 0) || 1;
  return (
    <div>
      <p className="text-muted">不動産の時価も含めた純資産</p>
      <p className="mt-2 leading-none font-bold text-pine">
        <span className="text-7xl tabular-nums md:text-8xl">{formatMan(netWorth).replace(/円$/, "")}</span>
        <span className="ml-1 text-3xl">円</span>
      </p>
      <div className="mt-10 flex h-14 overflow-hidden rounded-2xl" role="img" aria-label="資産の内訳">
        {items.map((i) => (
          <div key={i.label} className={`${i.color} border-r-2 border-cream last:border-0`} style={{ width: `${(i.value / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.label} className="flex items-center justify-between gap-4 rounded-2xl bg-white px-5 py-4">
            <span className="flex items-center gap-3 font-bold">
              <span className={`h-4 w-4 rounded ${i.color}`} />
              {i.label}
            </span>
            <span className="tabular-nums">{formatMan(i.value)}</span>
          </li>
        ))}
        {plan.liabilities > 0 && (
          <li className="flex items-center justify-between gap-4 rounded-2xl bg-white px-5 py-4">
            <span className="font-bold">負債</span>
            <span className="text-alert tabular-nums">−{formatMan(plan.liabilities)}</span>
          </li>
        )}
      </ul>
    </div>
  );
}
