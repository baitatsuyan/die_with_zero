"use client";

import { fieldClass, NumberField } from "@/components/office/Field";
import { POLICY_LABELS, USE_LABELS, type ClientPlan, type ClientRealEstate, type PropertyPolicy, type PropertyUse } from "@/lib/clientPlan";
import { PREFECTURES } from "@/lib/prefectures";
import { PROPERTY_TYPES, type PropertyType } from "@/lib/realEstateEstimate";

type Props = { plan: ClientPlan; onChange: (plan: ClientPlan) => void };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 md:p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

const newProperty = (): ClientRealEstate => ({
  id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()),
  label: "実家",
  propertyType: "house",
  prefecture: "東京都",
  city: "",
  district: "",
  use: "parents_home",
  value: 0,
  policy: "undecided",
});

/** 顧客の計画の入力欄。変更はそのまま onChange で親に渡す。 */
export function ClientEditor({ plan, onChange }: Props) {
  const set = <K extends keyof ClientPlan>(key: K, value: ClientPlan[K]) => onChange({ ...plan, [key]: value });
  const setProperty = (id: string, patch: Partial<ClientRealEstate>) =>
    set("realEstates", plan.realEstates.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const thisYear = new Date().getFullYear();

  return (
    <div className="space-y-5">
      <Section title="ご本人とご家族">
        <div>
          <label htmlFor="name" className="text-sm font-bold">
            お名前
          </label>
          <input id="name" value={plan.name} onChange={(e) => set("name", e.target.value)} maxLength={40} className={`mt-1 ${fieldClass}`} />
        </div>
        <NumberField id="birthYear" label="生まれた年" unit="年" value={plan.birthYear} onChange={(v) => set("birthYear", Math.min(thisYear, v))} hint={`いま${thisYear - plan.birthYear}歳`} />
        <NumberField id="lifeExpectancy" label="想定寿命" unit="歳" value={plan.lifeExpectancy} onChange={(v) => set("lifeExpectancy", Math.min(110, v))} />
        <div>
          <span className="text-sm font-bold">配偶者</span>
          <div className="mt-1 flex gap-2">
            {[
              { v: true, label: "いる" },
              { v: false, label: "いない" },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                aria-pressed={plan.hasSpouse === o.v}
                onClick={() => set("hasSpouse", o.v)}
                className={`flex-1 rounded-xl border px-4 py-2.5 font-bold ${plan.hasSpouse === o.v ? "border-pine bg-pine text-white" : "border-line"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <NumberField id="childrenCount" label="子の人数" unit="人" value={plan.childrenCount} onChange={(v) => set("childrenCount", Math.min(10, v))} />
      </Section>

      <Section title="収入と支出（月額）">
        <NumberField id="pension" label="年金（夫婦合計）" unit="万円" value={plan.pensionMonthly} onChange={(v) => set("pensionMonthly", v)} hint="65歳から受給として計算" />
        <NumberField id="otherIncome" label="年金以外の収入" unit="万円" value={plan.otherIncomeMonthly} onChange={(v) => set("otherIncomeMonthly", v)} hint="就労・家賃収入など" />
        <NumberField id="otherIncomeEnd" label="年金以外の収入は何歳まで" unit="歳" value={plan.otherIncomeEndAge} onChange={(v) => set("otherIncomeEndAge", v)} />
        <NumberField id="living" label="生活費" unit="万円" value={plan.monthlyLivingCost} onChange={(v) => set("monthlyLivingCost", v)} hint="いまの住まいの住居費を含む" />
      </Section>

      <Section title="金融資産と負債">
        <NumberField id="cash" label="預貯金" unit="万円" value={plan.cash} onChange={(v) => set("cash", v)} />
        <NumberField id="securities" label="証券（投資信託・株式など）" unit="万円" value={plan.securities} onChange={(v) => set("securities", v)} />
        <NumberField id="deathBenefit" label="死亡保険金" unit="万円" value={plan.deathBenefit} onChange={(v) => set("deathBenefit", v)} />
        <NumberField id="liabilities" label="借入金などの負債" unit="万円" value={plan.liabilities} onChange={(v) => set("liabilities", v)} />
        <NumberField id="safetyMargin" label="最期に残しておきたい額" unit="万円" value={plan.safetyMargin} onChange={(v) => set("safetyMargin", v)} hint="医療・介護の予備費など" />
      </Section>

      <section className="rounded-2xl border border-line bg-white p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">不動産</h2>
          <button type="button" onClick={() => set("realEstates", [...plan.realEstates, newProperty()])} className="rounded-full border border-pine px-4 py-2 text-sm font-bold text-pine hover:bg-pine-soft">
            ＋ 不動産を追加
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">方針が「売る」「未定」の不動産は、預貯金・証券が足りなくなる前に売却する前提で計算します。</p>
        <div className="mt-4 space-y-4">
          {plan.realEstates.length === 0 && <p className="rounded-xl bg-cream p-4 text-sm text-muted">登録されている不動産はありません。</p>}
          {plan.realEstates.map((r) => (
            <div key={r.id} className="rounded-xl border border-line p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor={`label-${r.id}`} className="text-sm font-bold">
                    呼び名
                  </label>
                  <input id={`label-${r.id}`} value={r.label} onChange={(e) => setProperty(r.id, { label: e.target.value })} maxLength={20} className={`mt-1 ${fieldClass}`} />
                </div>
                <div>
                  <label htmlFor={`use-${r.id}`} className="text-sm font-bold">
                    使い方
                  </label>
                  <select id={`use-${r.id}`} value={r.use} onChange={(e) => setProperty(r.id, { use: e.target.value as PropertyUse })} className={`mt-1 ${fieldClass}`}>
                    {Object.entries(USE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={`type-${r.id}`} className="text-sm font-bold">
                    種類
                  </label>
                  <select id={`type-${r.id}`} value={r.propertyType} onChange={(e) => setProperty(r.id, { propertyType: e.target.value as PropertyType })} className={`mt-1 ${fieldClass}`}>
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={`pref-${r.id}`} className="text-sm font-bold">
                    都道府県
                  </label>
                  <select id={`pref-${r.id}`} value={r.prefecture} onChange={(e) => setProperty(r.id, { prefecture: e.target.value })} className={`mt-1 ${fieldClass}`}>
                    {PREFECTURES.map((p) => (
                      <option key={p.code}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={`city-${r.id}`} className="text-sm font-bold">
                    市区町村
                  </label>
                  <input id={`city-${r.id}`} value={r.city} onChange={(e) => setProperty(r.id, { city: e.target.value })} maxLength={20} className={`mt-1 ${fieldClass}`} />
                </div>
                <div>
                  <label htmlFor={`district-${r.id}`} className="text-sm font-bold">
                    地区名
                  </label>
                  <input id={`district-${r.id}`} value={r.district} onChange={(e) => setProperty(r.id, { district: e.target.value })} maxLength={20} className={`mt-1 ${fieldClass}`} />
                </div>
                <NumberField id={`value-${r.id}`} label="時価の目安" unit="万円" value={r.value} onChange={(v) => setProperty(r.id, { value: v })} />
                <div className="sm:col-span-2">
                  <span className="text-sm font-bold">方針</span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(Object.keys(POLICY_LABELS) as PropertyPolicy[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        aria-pressed={r.policy === p}
                        onClick={() => setProperty(r.id, { policy: p })}
                        className={`rounded-full border px-4 py-2 text-sm font-bold ${r.policy === p ? "border-pine bg-pine text-white" : "border-line"}`}
                      >
                        {POLICY_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => set("realEstates", plan.realEstates.filter((x) => x.id !== r.id))} className="mt-3 text-sm font-bold text-alert hover:underline">
                この不動産を削除
              </button>
            </div>
          ))}
        </div>
        {plan.realEstates.some((r) => r.policy === "sell" || r.policy === "undecided") && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <NumberField id="relocation" label="住み替えの一時費用" unit="万円" value={plan.relocationCost} onChange={(v) => set("relocationCost", v)} />
            <NumberField id="housingAfter" label="売却後の住居費（月額）" unit="万円" value={plan.monthlyHousingAfterSale} onChange={(v) => set("monthlyHousingAfterSale", v)} />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 md:p-6">
        <h2 className="text-lg font-bold">メモ</h2>
        <div className="mt-4 grid gap-4">
          <div>
            <label htmlFor="proposalNote" className="text-sm font-bold">
              提案書に載せるコメント
            </label>
            <textarea id="proposalNote" value={plan.proposalNote ?? ""} onChange={(e) => set("proposalNote", e.target.value)} rows={3} maxLength={1000} className={`mt-1 ${fieldClass} font-normal`} />
          </div>
          <div>
            <label htmlFor="memo" className="text-sm font-bold">
              事務所内のメモ（提案書には出ません）
            </label>
            <textarea id="memo" value={plan.memo} onChange={(e) => set("memo", e.target.value)} rows={3} maxLength={2000} className={`mt-1 ${fieldClass} font-normal`} />
          </div>
        </div>
      </section>
    </div>
  );
}
