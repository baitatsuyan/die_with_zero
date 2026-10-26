"use client";

import { useMemo, useState } from "react";
import { NumberInput } from "@/components/NumberInput";
import { calculateInheritanceTax, type HeirTax } from "@/lib/inheritanceTax";

type AssetKey = "financialAssets" | "realEstate" | "deathBenefit" | "liabilities";
type SpouseMode = "legal" | "all";

const ASSET_FIELDS: { key: AssetKey; label: string; hint: string }[] = [
  { key: "financialAssets", label: "預貯金・証券", hint: "現金・預金・投資信託・株式などの合計" },
  { key: "realEstate", label: "不動産（時価の合計）", hint: "自宅・実家・土地など。分からなければ概算で" },
  { key: "deathBenefit", label: "死亡保険金", hint: "亡くなったときに家族が受け取る保険金" },
  { key: "liabilities", label: "借入金などの負債", hint: "住宅ローン残高など" },
];

const man = (v: number) => Math.round(v).toLocaleString();

const heirLabel = (h: HeirTax, index: number) =>
  h.role === "spouse" ? "配偶者" : h.role === "child" ? `子 ${index}` : "相続人";

export function InheritanceSimulator() {
  const [hasSpouse, setHasSpouse] = useState(true);
  const [childrenCount, setChildrenCount] = useState(2);
  const [spouseMode, setSpouseMode] = useState<SpouseMode>("legal");
  const [assets, setAssets] = useState<Record<AssetKey, number>>({
    financialAssets: 5000,
    realEstate: 4000,
    deathBenefit: 1000,
    liabilities: 0,
  });

  const estate = assets.financialAssets + assets.realEstate;
  const result = useMemo(() => {
    const base = { estate, liabilities: assets.liabilities, deathBenefit: assets.deathBenefit, hasSpouse, childrenCount };
    const legal = calculateInheritanceTax(base);
    return spouseMode === "all" && hasSpouse ? calculateInheritanceTax({ ...base, spouseAcquisition: legal.taxablePrice }) : legal;
  }, [estate, assets.liabilities, assets.deathBenefit, hasSpouse, childrenCount, spouseMode]);

  const updateAsset = (key: AssetKey, value: number) => setAssets((prev) => ({ ...prev, [key]: value }));

  const hasTax = result.taxableEstate > 0;
  const room = result.basicDeduction - result.taxablePrice;

  const steps = [
    { label: "遺産の合計（保険金を含む）", value: estate + assets.deathBenefit, sign: "" },
    { label: "負債", value: assets.liabilities, sign: "−" },
    { label: `死亡保険金の非課税枠（500万円×${result.heirsCount}人まで）`, value: result.insuranceExemption, sign: "−" },
    { label: "課税価格", value: result.taxablePrice, sign: "=", strong: true },
    { label: `基礎控除（3,000万円＋600万円×${result.heirsCount}人）`, value: result.basicDeduction, sign: "−" },
    { label: "課税遺産総額", value: result.taxableEstate, sign: "=", strong: true },
    { label: "相続税の総額（法定相続分で按分して速算表で計算）", value: result.totalTax, sign: "" },
    { label: "配偶者の税額軽減", value: result.spouseReduction, sign: "−" },
    { label: "納める相続税の合計", value: result.payableTax, sign: "=", strong: true },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <form className="space-y-8 rounded-3xl border border-line bg-white p-6 shadow-sm md:p-8" onSubmit={(e) => e.preventDefault()}>
        <fieldset>
          <legend className="text-lg font-bold">家族構成</legend>
          <p className="text-sm text-muted">配偶者とお子さんが相続する場合で計算します。</p>
          <div className="mt-4 flex items-center justify-between gap-4">
            <span className="font-bold">配偶者</span>
            <div className="flex rounded-full bg-cream p-1" role="radiogroup" aria-label="配偶者の有無">
              {[
                { v: true, label: "いる" },
                { v: false, label: "いない" },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  role="radio"
                  aria-checked={hasSpouse === o.v}
                  onClick={() => setHasSpouse(o.v)}
                  className={`rounded-full px-5 py-2 font-bold transition ${hasSpouse === o.v ? "bg-pine text-white" : "text-muted"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-4">
            <span className="font-bold">子の人数</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="子の人数を減らす"
                onClick={() => setChildrenCount((c) => Math.max(0, c - 1))}
                className="h-11 w-11 rounded-full border border-line text-xl font-bold text-pine disabled:opacity-40"
                disabled={childrenCount === 0}
              >
                −
              </button>
              <span className="w-12 text-center text-2xl font-bold tabular-nums" aria-live="polite">
                {childrenCount}人
              </span>
              <button
                type="button"
                aria-label="子の人数を増やす"
                onClick={() => setChildrenCount((c) => Math.min(10, c + 1))}
                className="h-11 w-11 rounded-full border border-line text-xl font-bold text-pine"
              >
                ＋
              </button>
            </div>
          </div>
          {!hasSpouse && childrenCount === 0 && (
            <p className="mt-4 rounded-xl bg-sun-soft p-3 text-sm">
              ご両親やご兄弟が相続する場合は、相続人の範囲や税額の2割加算などが関わるため、専門家への相談をおすすめします（ここでは1人が全部を相続した場合で計算しています）。
            </p>
          )}
        </fieldset>

        <fieldset className="space-y-5">
          <legend className="text-lg font-bold">財産と負債</legend>
          {ASSET_FIELDS.map((f) => (
            <div key={f.key}>
              <label htmlFor={f.key} className="font-bold">
                {f.label}
              </label>
              <p className="text-sm text-muted">{f.hint}</p>
              <div className="mt-2 flex items-center gap-3">
                <NumberInput
                  id={f.key}
                  value={assets[f.key]}
                  onChange={(v) => updateAsset(f.key, v)}
                  className="w-full rounded-xl border border-line bg-cream px-4 py-3 text-right text-xl font-bold tabular-nums focus:border-pine focus:ring-2 focus:ring-pine/30 focus:outline-none"
                />
                <span className="w-10 shrink-0 text-muted">万円</span>
              </div>
            </div>
          ))}
        </fieldset>

        {hasSpouse && (
          <fieldset>
            <legend className="text-lg font-bold">配偶者が受け取る割合</legend>
            <div className="mt-3 grid gap-2">
              {[
                { v: "legal" as const, label: "法定相続分どおり", note: childrenCount > 0 ? "配偶者が1/2、残りを子で均等に" : "配偶者がすべて" },
                { v: "all" as const, label: "配偶者がすべて受け取る", note: "子は次の相続（二次相続）で受け取る" },
              ].map((o) => (
                <label
                  key={o.v}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${spouseMode === o.v ? "border-pine bg-pine-soft" : "border-line"}`}
                >
                  <input
                    type="radio"
                    name="spouseMode"
                    className="mt-1.5 accent-pine"
                    checked={spouseMode === o.v}
                    onChange={() => setSpouseMode(o.v)}
                  />
                  <span>
                    <span className="block font-bold">{o.label}</span>
                    <span className="text-sm text-muted">{o.note}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </form>

      <div className="flex flex-col gap-6">
        <div className="rounded-3xl bg-pine p-6 text-white shadow-lg md:p-8" aria-live="polite">
          <p className="font-bold text-white/80">いま相続が起きた場合の相続税（概算）</p>
          {hasTax ? (
            <>
              <p className="mt-1 leading-none font-bold">
                <span className="text-6xl tabular-nums md:text-7xl">{man(result.payableTax)}</span>
                <span className="ml-2 text-2xl">万円</span>
              </p>
              <p className="mt-3 text-white/85">
                {result.payableTax === 0
                  ? "配偶者の税額軽減により、納める税額は0円の見込みです。申告は必要になるため注意してください。"
                  : `課税価格${man(result.taxablePrice)}万円のうち、基礎控除を超える${man(result.taxableEstate)}万円に相続税がかかる見込みです。`}
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-4xl leading-snug font-bold md:text-5xl">かからない見込みです</p>
              <p className="mt-3 text-white/85">
                課税価格{man(result.taxablePrice)}万円は基礎控除{man(result.basicDeduction)}万円の範囲内です。
                あと<strong className="text-sun-soft">{man(room)}万円</strong>までは相続税がかかりません。
              </p>
            </>
          )}
          <p className="mt-4 text-xs text-white/70">※ 不動産は時価で計算した保守的な目安です。正確な額は税理士にご相談ください。</p>
        </div>

        {result.heirs.length > 0 && (
          <div className="rounded-3xl border border-line bg-white p-6 md:p-8">
            <h3 className="text-lg font-bold">相続人ごとの内訳</h3>
            <table className="mt-4 w-full text-left">
              <thead className="text-sm text-muted">
                <tr className="border-b border-line">
                  <th className="py-2 font-normal">相続人</th>
                  <th className="py-2 text-right font-normal">受け取る額</th>
                  <th className="py-2 text-right font-normal">相続税</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {result.heirs.map((h, i) => (
                  <tr key={i} className="border-b border-line/60 last:border-0">
                    <td className="py-3 font-bold">{heirLabel(h, hasSpouse ? i : i + 1)}</td>
                    <td className="py-3 text-right">{man(h.acquisition)}万円</td>
                    <td className="py-3 text-right font-bold text-pine">{man(h.tax)}万円</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {spouseMode === "all" && hasSpouse && childrenCount > 0 && (
              <p className="mt-4 rounded-xl bg-sun-soft p-3 text-sm">
                配偶者がすべて受け取ると今回の税額は小さくなりますが、配偶者が亡くなったとき（二次相続）は相続人が減り、子の負担が大きくなることがあります。
              </p>
            )}
          </div>
        )}

        <details className="group rounded-3xl border border-line bg-white p-6 md:p-8">
          <summary className="flex cursor-pointer list-none items-center justify-between font-bold">
            計算の流れを見る
            <span className="text-2xl text-pine transition group-open:rotate-45">+</span>
          </summary>
          <dl className="mt-4 space-y-1 tabular-nums">
            {steps.map((s) => (
              <div
                key={s.label}
                className={`flex items-baseline justify-between gap-4 py-2 ${s.strong ? "border-t border-line font-bold" : "text-muted"}`}
              >
                <dt className="text-sm">
                  <span className="inline-block w-4 text-pine">{s.sign}</span>
                  {s.label}
                </dt>
                <dd className="shrink-0">{man(s.value)}万円</dd>
              </div>
            ))}
          </dl>
        </details>

        {assets.realEstate > 0 && (
          <div className="rounded-3xl bg-pine-soft p-6">
            <p className="font-bold text-pine">「小規模宅地等の特例」が使える可能性があります</p>
            <p className="mt-2 text-sm text-muted">
              亡くなった方の自宅の土地を、配偶者や同居していた家族が相続する場合などは、土地の評価額が大きく下がることがあります。この試算には含めていないため、実際の税額はこれより少なくなる場合があります。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
