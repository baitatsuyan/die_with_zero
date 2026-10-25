"use client";

import Link from "next/link";
import { useState } from "react";
import { BalanceChart } from "@/components/BalanceChart";
import { formatMan } from "@/lib/format";
import type { QuickInput, QuickResult } from "@/lib/simulation";

const man = (v: number) => Math.round(v).toLocaleString();

type Props = {
  input: QuickInput;
  result: QuickResult;
  action: { href: string; label: string };
};

/** かんたん診断の結果（使える額・資産推移・シェア）を表示するパネル。 */
export function QuickResultPanel({ input, result, action }: Props) {
  const [copied, setCopied] = useState(false);
  const extraMonthly = result.extraAnnualSpend / 12;
  const hasRealEstate = input.realEstateValue > 0;
  // 売却期限の目安：現金が尽きる2〜3年前。期限が目前で余裕が取れないときは「できるだけ早めに」
  const saleWindow =
    result.saleAge === null || result.cashRunOutAge === null
      ? ""
      : result.cashRunOutAge - result.saleAge >= 3
        ? `2〜3年前の${result.saleAge}〜${result.saleAge + 1}歳`
        : `できるだけ早めに、遅くとも${result.saleAge}歳`;
  const shareText =
    result.extraAnnualSpend > 0
      ? `私は毎年あと約${formatMan(result.extraAnnualSpend)}使えるみたい。あなたが使い切れる額は？ #使い切りプランナー`
      : "人生後半のお金、いくら使えるか試算してみました。 #使い切りプランナー";

  const share = async () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/quick` : "";
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
    <div className="flex flex-col gap-6 rounded-3xl bg-pine p-6 text-white shadow-lg md:p-8" aria-live="polite">
      {result.extraAnnualSpend > 0 ? (
        <div>
          <p className="font-bold text-white/80">{hasRealEstate ? "不動産の売却も含めて、毎年あと使える額" : "あなたが毎年あと使える額"}</p>
          <p className="mt-1 leading-none font-bold">
            <span className="text-6xl tabular-nums md:text-7xl">{man(result.extraAnnualSpend)}</span>
            <span className="ml-2 text-2xl">万円</span>
          </p>
          <p className="mt-3 text-white/85">
            月にすると約<strong className="text-sun-soft">{formatMan(extraMonthly)}</strong>。
            旅行や趣味、家族との時間に使っても、{input.lifeExpectancy}歳で{formatMan(input.safetyMargin)}が残る計算です。
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

      {hasRealEstate && result.saleAge !== null && (
        <div className="rounded-2xl bg-sun-soft p-5 text-ink">
          <p className="text-sm font-bold text-muted">不動産の売却期限</p>
          <p className="mt-1 text-3xl font-bold">
            <span className="tabular-nums">{result.saleAge}</span>歳までに売却
          </p>
          <p className="mt-2 text-sm leading-relaxed">
            {result.cashRunOutAge !== null &&
              `${result.extraAnnualSpend > 0 ? "この使い方だと、" : ""}${result.cashRunOutAge}歳ごろに預貯金・証券が尽きる見込みです。売却には時間がかかることもあるため、${saleWindow}までに売却しておくと安心です。`}
            {result.extraAnnualSpend > 0 &&
              `${result.saleAge}歳で売却すると、住み替えの一時費用を差し引いて約${formatMan(result.saleProceeds)}が手元に残り、住み替え先の住居費（月${formatMan(input.monthlyHousingAfterSale)}）を払いながら${input.lifeExpectancy}歳まで暮らせる計算です。`}
          </p>
          <p className="mt-3 border-t border-ink/10 pt-3 text-sm">
            {result.extraAnnualSpendWithoutSale > 0
              ? `売らずに暮らす場合は、毎年あと${formatMan(result.extraAnnualSpendWithoutSale)}です。`
              : result.cashDepletionAge !== null
                ? `売らない場合は、${result.cashDepletionAge}歳で預貯金・証券が尽きます。`
                : "売らない場合は、上乗せして使える余裕はありません。"}
          </p>
          <p className="mt-2 text-xs text-muted">
            売却額{formatMan(input.realEstateValue)}から、諸費用・税の目安として1割と、住み替えの一時費用{formatMan(input.relocationCost)}を差し引いています。
          </p>
        </div>
      )}
      {hasRealEstate && result.saleAge === null && (
        <div className="rounded-2xl bg-white/10 p-5">
          {result.saleProceeds <= 0 ? (
            <>
              <p className="font-bold">売却しても手元の資金は増えない見込みです</p>
              <p className="mt-1 text-sm text-white/80">
                住み替えの一時費用が、売却で手元に残る額を上回るため、売却は計画に入れていません。
              </p>
            </>
          ) : (
            <>
              <p className="font-bold">不動産は売らなくても足りる見込みです</p>
              <p className="mt-1 text-sm text-white/80">{input.lifeExpectancy}歳まで、預貯金・証券だけで暮らせる計算です。</p>
            </>
          )}
        </div>
      )}

      <div className="rounded-2xl bg-white p-3 md:p-4">
        <BalanceChart path={result.path} plannedPath={result.plannedPath} safetyMargin={input.safetyMargin} saleAge={result.extraAnnualSpend > 0 ? result.saleAge : null} />
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 px-2 text-sm text-muted">
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
          {hasRealEstate && result.saleAge !== null && result.extraAnnualSpend > 0 && (
            <li className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-sun" />
              不動産を売却
            </li>
          )}
        </ul>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-white/10 p-4">
          <dt className="text-white/75">何も使わないと最期に残る額</dt>
          <dd className="mt-1 text-xl font-bold whitespace-nowrap tabular-nums md:text-2xl">{result.finalBalance < 0 ? "不足" : formatMan(result.finalBalance)}</dd>
        </div>
        <div className="rounded-2xl bg-white/10 p-4">
          <dt className="text-white/75">{input.lifeExpectancy}歳までに使える合計</dt>
          <dd className="mt-1 text-xl font-bold whitespace-nowrap tabular-nums md:text-2xl">
            {formatMan(result.extraAnnualSpend * (input.lifeExpectancy - input.currentAge))}
          </dd>
        </div>
      </dl>

      <div className="mt-auto flex flex-col gap-3 sm:flex-row">
        <Link
          href={action.href}
          className="flex-1 rounded-full bg-sun px-6 py-4 text-center font-bold text-ink transition hover:brightness-105"
        >
          {action.label}
        </Link>
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
  );
}
