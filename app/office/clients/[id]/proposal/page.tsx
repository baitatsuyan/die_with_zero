"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { BalanceChart } from "@/components/BalanceChart";
import { nextActions, POLICY_LABELS, summarizePlan, USE_LABELS } from "@/lib/clientPlan";
import { formatMan } from "@/lib/format";
import { OFFICE_TYPE_LABELS, useOfficeStore } from "@/lib/office/store";

/** 提案書。画面で確認し、ブラウザの印刷から PDF で保存する（A4縦）。 */
export default function ProposalPage() {
  const { id } = useParams<{ id: string }>();
  const { office, clients } = useOfficeStore();
  const client = clients.find((c) => c.id === id);
  if (!client || !office) return null;

  const plan = client.plan;
  const s = summarizePlan(plan);
  const d = s.diagnosis;
  const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-6 print:max-w-none print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/office/clients/${client.id}`} className="text-sm font-bold text-pine hover:underline">
          ← {plan.name} 様の画面へ
        </Link>
        <button type="button" onClick={() => window.print()} className="rounded-full bg-sun px-6 py-3 font-bold text-ink shadow-sm hover:brightness-105">
          印刷する／PDFで保存
        </button>
      </div>
      <p className="mb-4 text-sm text-muted print:hidden">印刷の画面で、送信先を「PDFに保存」にするとPDFになります。</p>

      <article className="space-y-8 bg-white p-8 shadow-sm md:p-12 print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-pine pb-6">
          <div>
            <p className="text-sm font-bold text-pine">人生後半のお金の計画</p>
            <h1 className="mt-1 text-3xl font-bold">{plan.name} 様</h1>
            <p className="mt-1 text-sm text-muted">作成日：{today}</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-lg font-bold">{office.name}</p>
            <p className="text-muted">{OFFICE_TYPE_LABELS[office.type]}</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4 print:grid-cols-4">
          {[
            { label: "毎年あと使える額", value: formatMan(d.extraAnnualSpend), strong: true },
            { label: "純資産（不動産込み）", value: formatMan(s.netWorth) },
            { label: "不動産の売却期限", value: d.saleAge !== null ? `${d.saleAge}歳まで` : "—" },
            { label: "相続税の目安（いま）", value: s.taxNow.payableTax > 0 ? formatMan(s.taxNow.payableTax) : "かからない見込み" },
          ].map((k) => (
            <div key={k.label} className={`rounded-xl p-4 ${k.strong ? "bg-pine text-white" : "bg-cream"}`}>
              <p className={`text-xs font-bold ${k.strong ? "text-white/80" : "text-muted"}`}>{k.label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{k.value}</p>
            </div>
          ))}
        </section>

        <section className="break-inside-avoid">
          <h2 className="text-lg font-bold">資産の見通し</h2>
          <p className="mt-1 text-sm text-muted">
            毎年{formatMan(d.extraAnnualSpend)}を上乗せして使っても、{plan.lifeExpectancy}歳で{formatMan(plan.safetyMargin)}が残る計算です（月にすると約{formatMan(d.extraAnnualSpend / 12)}）。
            {d.saleAge !== null && `${d.cashRunOutAge}歳ごろに預貯金・証券が最期に残しておきたい額を下回るため、${d.saleAge}歳までに不動産を売却する前提で計算しています。`}
          </p>
          <div className="mt-3 rounded-xl border border-line p-3">
            <BalanceChart path={d.path} plannedPath={d.plannedPath} safetyMargin={plan.safetyMargin} saleAge={d.extraAnnualSpend > 0 ? d.saleAge : null} />
          </div>
        </section>

        {plan.realEstates.length > 0 && (
          <section className="break-inside-avoid">
            <h2 className="text-lg font-bold">不動産と方針</h2>
            <table className="mt-3 w-full text-left text-sm">
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
                {plan.realEstates.map((r) => (
                  <tr key={r.id} className="border-b border-line/60">
                    <td className="py-2 font-bold">{r.label}</td>
                    <td className="py-2">
                      {r.prefecture}
                      {r.city}
                      {r.district}
                    </td>
                    <td className="py-2">{USE_LABELS[r.use]}</td>
                    <td className="py-2 text-right tabular-nums">{formatMan(r.value)}</td>
                    <td className={`py-2 text-right font-bold ${r.policy === "undecided" ? "text-alert" : "text-pine"}`}>{POLICY_LABELS[r.policy]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="break-inside-avoid">
          <h2 className="text-lg font-bold">相続税の目安</h2>
          <p className="mt-1 text-sm">
            いま相続が起きた場合、課税価格{formatMan(s.taxNow.taxablePrice)}に対して基礎控除は{formatMan(s.taxNow.basicDeduction)}です。
            {s.taxNow.payableTax > 0 ? `納める相続税の合計は約${formatMan(s.taxNow.payableTax)}の見込みです。` : "相続税はかからない見込みです。"}
          </p>
        </section>

        <section className="break-inside-avoid">
          <h2 className="text-lg font-bold">次にやること</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {nextActions(plan, s).map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ol>
        </section>

        {plan.proposalNote?.trim() && (
          <section className="break-inside-avoid rounded-xl bg-cream p-5">
            <h2 className="font-bold">{office.name}より</h2>
            <p className="mt-2 text-sm whitespace-pre-wrap">{plan.proposalNote}</p>
          </section>
        )}

        <footer className="border-t border-line pt-4 text-xs leading-relaxed text-muted">
          本資料の試算はすべて概算であり、将来の運用成果や税額を保証するものではありません。相続税の目安は不動産の時価をもとにした保守的な概算で、実際の相続税評価額（路線価等）とは異なります。正確な税額は税理士にご確認ください。想定寿命{plan.lifeExpectancy}歳・物価上昇率1.5%・運用利回り2%で計算しています。作成：使い切りプランナー
        </footer>
      </article>
    </main>
  );
}
