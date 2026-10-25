"use client";

import { useMemo, useState } from "react";
import { BalanceChart } from "@/components/BalanceChart";
import { DEFAULT_QUICK_INPUT, runQuickDiagnosis, type QuickInput } from "@/lib/simulation";

type FieldKey = "currentAge" | "financialAssets" | "monthlyPension" | "monthlyLivingCost" | "safetyMargin";

const FIELDS: { key: FieldKey; label: string; hint: string; unit: string; min: number; max: number; step: number }[] = [
  { key: "currentAge", label: "いまの年齢", hint: "", unit: "歳", min: 40, max: 85, step: 1 },
  { key: "financialAssets", label: "預貯金・証券の合計", hint: "ざっくりで大丈夫です", unit: "万円", min: 0, max: 30000, step: 100 },
  { key: "monthlyPension", label: "年金の見込み（月額）", hint: "ご夫婦の合計。65歳から受給として計算", unit: "万円", min: 0, max: 60, step: 1 },
  { key: "monthlyLivingCost", label: "毎月の生活費", hint: "住居費を含めた平均", unit: "万円", min: 5, max: 100, step: 1 },
  { key: "safetyMargin", label: "最期に残しておきたい額", hint: "医療・介護の予備費など", unit: "万円", min: 0, max: 10000, step: 100 },
];

const man = (v: number) => Math.round(v).toLocaleString();

export function QuickDiagnosis() {
  const [input, setInput] = useState<QuickInput>(DEFAULT_QUICK_INPUT);
  const [copied, setCopied] = useState(false);
  const result = useMemo(() => runQuickDiagnosis(input), [input]);

  const update = (key: FieldKey, raw: string) => {
    const n = Number(raw);
    if (Number.isFinite(n)) setInput((prev) => ({ ...prev, [key]: n }));
  };

  const extraMonthly = result.extraAnnualSpend / 12;
  const shareText =
    result.extraAnnualSpend > 0
      ? `私は毎年あと約${man(result.extraAnnualSpend)}万円使えるみたい。あなたが使い切れる額は？ #使い切りプランナー`
      : "人生後半のお金、いくら使えるか試算してみました。 #使い切りプランナー";

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href.split("#")[0] : "";
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText, url });
        return;
      }
      await navigator.clipboard.writeText(`${shareText} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 共有をキャンセルした場合は何もしない
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <form className="rounded-3xl border border-line bg-white p-6 shadow-sm md:p-8" onSubmit={(e) => e.preventDefault()}>
        <p className="mb-6 text-sm font-bold text-pine">5つの質問・約1分</p>
        <div className="space-y-6">
          {FIELDS.map((f, i) => (
            <div key={f.key}>
              <label htmlFor={f.key} className="flex items-baseline gap-2 font-bold">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pine-soft text-sm text-pine">
                  {i + 1}
                </span>
                {f.label}
              </label>
              {f.hint && <p className="ml-9 text-sm text-muted">{f.hint}</p>}
              <div className="mt-2 ml-9 flex items-center gap-3">
                <input
                  id={f.key}
                  type="number"
                  inputMode="numeric"
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  value={input[f.key]}
                  onChange={(e) => update(f.key, e.target.value)}
                  className="w-full rounded-xl border border-line bg-cream px-4 py-3 text-right text-xl font-bold tabular-nums focus:border-pine focus:ring-2 focus:ring-pine/30 focus:outline-none"
                />
                <span className="w-10 shrink-0 text-muted">{f.unit}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs leading-relaxed text-muted">
          想定寿命90歳・物価上昇率1.5%・運用利回り2%で計算しています（詳細診断で変更できます）。
        </p>
      </form>

      <div className="flex flex-col gap-6 rounded-3xl bg-pine p-6 text-white shadow-lg md:p-8" aria-live="polite">
        {result.extraAnnualSpend > 0 ? (
          <div>
            <p className="font-bold text-white/80">あなたが毎年あと使える額</p>
            <p className="mt-1 leading-none font-bold">
              <span className="text-6xl tabular-nums md:text-7xl">{man(result.extraAnnualSpend)}</span>
              <span className="ml-2 text-2xl">万円</span>
            </p>
            <p className="mt-3 text-white/85">
              月にすると約<strong className="text-sun-soft">{man(extraMonthly)}万円</strong>。
              旅行や趣味、家族との時間に使っても、{input.lifeExpectancy}歳で{man(input.safetyMargin)}万円が残る計算です。
            </p>
          </div>
        ) : (
          <div>
            <p className="font-bold text-white/80">試算結果</p>
            <p className="mt-2 text-3xl leading-snug font-bold">
              {result.depletionAge ? `このままだと${result.depletionAge}歳ごろに資産が尽きる見込みです` : "いまの計画でちょうどの水準です"}
            </p>
            <p className="mt-3 text-white/85">
              実家や保有不動産の活用、働き方、生活費の見直しで計画は変わります。詳細診断で一緒に組み立てましょう。
            </p>
          </div>
        )}

        <div className="rounded-2xl bg-white p-3 md:p-4">
          <BalanceChart path={result.path} plannedPath={result.plannedPath} safetyMargin={input.safetyMargin} />
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 px-2 text-xs text-muted">
            <li className="flex items-center gap-2">
              <span className="inline-block h-1 w-5 rounded bg-pine" />
              使い切りプラン
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block w-5 border-t-2 border-dotted border-muted" />
              追加で使わない場合
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block w-5 border-t-2 border-dashed border-sun" />
              残しておきたい額
            </li>
          </ul>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-white/10 p-4">
            <dt className="text-white/75">何も使わないと最期に残る額</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{result.finalBalance < 0 ? "不足" : `${man(result.finalBalance)}万円`}</dd>
          </div>
          <div className="rounded-2xl bg-white/10 p-4">
            <dt className="text-white/75">{input.lifeExpectancy}歳までに使える合計</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">
              {man(result.extraAnnualSpend * (input.lifeExpectancy - input.currentAge))}万円
            </dd>
          </div>
        </dl>

        <div className="mt-auto flex flex-col gap-3 sm:flex-row">
          <a
            href="#start"
            className="flex-1 rounded-full bg-sun px-6 py-4 text-center font-bold text-ink transition hover:brightness-105"
          >
            不動産・相続も含めて詳しく診断する
          </a>
          <button
            type="button"
            onClick={share}
            className="rounded-full border border-white/40 px-6 py-4 font-bold transition hover:bg-white/10"
          >
            {copied ? "コピーしました" : "結果をシェア"}
          </button>
        </div>
        <p className="text-xs text-white/70">※ 概算です。実際の金額は年金額・税・社会保険料などにより変わります。</p>
      </div>
    </div>
  );
}
