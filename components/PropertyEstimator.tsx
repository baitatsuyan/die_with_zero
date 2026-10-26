"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatMan } from "@/lib/format";
import { sanitizeDigits } from "@/lib/numberText";
import { PREFECTURES } from "@/lib/prefectures";
import { PROPERTY_TYPES, type Estimate, type PropertyType } from "@/lib/realEstateEstimate";
import { DEFAULT_QUICK_INPUT, type QuickInput } from "@/lib/simulation";
import { loadJSON, saveJSON, STORAGE_KEYS } from "@/lib/storage";

export type SavedProperty = {
  prefCode: string;
  cityCode: string;
  cityName: string;
  district: string;
  propertyType: PropertyType;
  areaSqm: number;
  builtYear: number | null;
  estimate: Estimate | null;
};

type Status = "idle" | "loading" | "done" | "not_configured" | "not_enough_data" | "error";

const ERROR_MESSAGES: Record<Exclude<Status, "idle" | "loading" | "done">, string> = {
  not_configured: "時価の推定は準備中です。いまは「売ったらいくらになりそうか」の目安を、ご自身で入力してください。",
  not_enough_data: "この地域・種類の取引事例が少ないため、推定できませんでした。地区名を外すか、近くの市区町村でお試しください。",
  error: "取引事例を取得できませんでした。時間をおいてもう一度お試しください。",
};

const inputClass =
  "w-full rounded-xl border border-line bg-cream px-4 py-3 text-lg font-bold focus:border-pine focus:ring-2 focus:ring-pine/30 focus:outline-none";

export function PropertyEstimator() {
  const router = useRouter();
  const [prefCode, setPrefCode] = useState("13");
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [citiesStatus, setCitiesStatus] = useState<"loading" | "ok" | "not_configured" | "error">("loading");
  const [cityCode, setCityCode] = useState("");
  const [district, setDistrict] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType>("house");
  const [area, setArea] = useState("120");
  const [builtYear, setBuiltYear] = useState("1995");
  const [status, setStatus] = useState<Status>("idle");
  const [estimate, setEstimate] = useState<Estimate | null>(null);

  // 前回の入力があれば復元する
  useEffect(() => {
    const saved = loadJSON<SavedProperty>(STORAGE_KEYS.property);
    if (!saved) return;
    setPrefCode(saved.prefCode);
    setCityCode(saved.cityCode);
    setDistrict(saved.district);
    setPropertyType(saved.propertyType);
    setArea(String(saved.areaSqm));
    setBuiltYear(saved.builtYear ? String(saved.builtYear) : "");
    if (saved.estimate) {
      setEstimate(saved.estimate);
      setStatus("done");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setCitiesStatus("loading");
    fetch(`/api/real-estate/cities?pref=${prefCode}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 503) return setCitiesStatus("not_configured");
        if (!res.ok) return setCitiesStatus("error");
        const body = (await res.json()) as { cities: { id: string; name: string }[] };
        setCities(body.cities);
        setCitiesStatus("ok");
        setCityCode((current) => (body.cities.some((c) => c.id === current) ? current : (body.cities[0]?.id ?? "")));
      })
      .catch(() => !cancelled && setCitiesStatus("error"));
    return () => {
      cancelled = true;
    };
  }, [prefCode]);

  const typeInfo = PROPERTY_TYPES.find((t) => t.value === propertyType)!;
  const areaNum = Number(area);
  const builtYearNum = builtYear ? Number(builtYear) : null;
  const thisYear = new Date().getFullYear();
  const builtYearValid = builtYearNum === null || (Number.isInteger(builtYearNum) && builtYearNum >= 1900 && builtYearNum <= thisYear);
  const canSubmit = citiesStatus === "ok" && cityCode !== "" && areaNum >= 10 && areaNum <= 100000 && builtYearValid && status !== "loading";
  const cityName = cities.find((c) => c.id === cityCode)?.name ?? "";
  const prefName = PREFECTURES.find((p) => p.code === prefCode)?.name ?? "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("loading");
    const params = new URLSearchParams({ city: cityCode, type: propertyType, area: String(areaNum) });
    if (propertyType !== "land" && builtYearNum) params.set("builtYear", String(builtYearNum));
    if (district.trim()) params.set("district", district.trim());
    try {
      const res = await fetch(`/api/real-estate?${params}`);
      const body = (await res.json()) as { estimate?: Estimate; error?: string };
      if (res.ok && body.estimate) {
        setEstimate(body.estimate);
        setStatus("done");
        save(body.estimate);
      } else {
        setEstimate(null);
        setStatus(body.error === "not_configured" ? "not_configured" : body.error === "not_enough_data" ? "not_enough_data" : "error");
      }
    } catch {
      setStatus("error");
    }
  };

  const save = (est: Estimate | null) =>
    saveJSON(STORAGE_KEYS.property, {
      prefCode,
      cityCode,
      cityName: `${prefName}${cityName}`,
      district: district.trim(),
      propertyType,
      areaSqm: areaNum,
      builtYear: propertyType === "land" ? null : builtYearNum,
      estimate: est,
    } satisfies SavedProperty);

  const applyToDiagnosis = () => {
    if (!estimate) return;
    const saved = loadJSON<Partial<QuickInput>>(STORAGE_KEYS.quickInput);
    saveJSON(STORAGE_KEYS.quickInput, { ...DEFAULT_QUICK_INPUT, ...saved, realEstateValue: estimate.mid });
    router.push("/quick");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <form onSubmit={submit} noValidate className="min-w-0 space-y-6 rounded-3xl border border-line bg-white p-6 shadow-sm md:p-8">
        <fieldset className="space-y-4">
          <legend className="text-lg font-bold">所在地</legend>
          <div>
            <label htmlFor="pref" className="font-bold">
              都道府県
            </label>
            <select id="pref" value={prefCode} onChange={(e) => setPrefCode(e.target.value)} className={`mt-2 ${inputClass}`}>
              {PREFECTURES.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="city" className="font-bold">
              市区町村
            </label>
            <select
              id="city"
              value={cityCode}
              onChange={(e) => setCityCode(e.target.value)}
              disabled={citiesStatus !== "ok"}
              className={`mt-2 ${inputClass} disabled:opacity-60`}
            >
              {citiesStatus === "loading" && <option>読み込み中…</option>}
              {citiesStatus === "not_configured" && <option>準備中</option>}
              {citiesStatus === "error" && <option>読み込めませんでした</option>}
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="district" className="font-bold">
              地区名（任意）
            </label>
            <p className="text-sm text-muted">「日本橋」「月島」など。近い地区の事例が多いときは、その事例で推定します</p>
            <input id="district" value={district} onChange={(e) => setDistrict(e.target.value)} maxLength={30} className={`mt-2 ${inputClass}`} />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-lg font-bold">物件</legend>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="物件の種類">
            {PROPERTY_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={propertyType === t.value}
                onClick={() => setPropertyType(t.value)}
                className={`rounded-xl border px-2 py-3 font-bold transition ${
                  propertyType === t.value ? "border-pine bg-pine text-white" : "border-line text-ink hover:border-pine"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div>
            <label htmlFor="area" className="font-bold">
              {typeInfo.areaLabel}
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                id="area"
                type="text"
                inputMode="numeric"
                value={area}
                onChange={(e) => setArea(sanitizeDigits(e.target.value))}
                className={`${inputClass} text-right tabular-nums`}
              />
              <span className="w-8 shrink-0 text-muted">㎡</span>
            </div>
          </div>
          {propertyType !== "land" && (
            <div>
              <label htmlFor="builtYear" className="font-bold">
                建てた年（任意）
              </label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  id="builtYear"
                  type="text"
                  inputMode="numeric"
                  value={builtYear}
                  onChange={(e) => setBuiltYear(sanitizeDigits(e.target.value))}
                  aria-invalid={!builtYearValid}
                  className={`${inputClass} text-right tabular-nums`}
                />
                <span className="w-8 shrink-0 text-muted">年</span>
              </div>
              {!builtYearValid && <p className="mt-1 text-sm font-bold text-alert">1900〜{thisYear}年の西暦で入力してください</p>}
            </div>
          )}
        </fieldset>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-full bg-sun px-6 py-4 text-lg font-bold text-ink shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" ? "取引事例を調べています…" : "時価を推定する"}
        </button>
      </form>

      <div className="flex min-w-0 flex-col gap-6" aria-live="polite">
        {status === "done" && estimate ? (
          <>
            <div className="rounded-3xl bg-pine p-6 text-white shadow-lg md:p-8">
              <p className="font-bold text-white/80">推定時価（売ったらいくらになりそうか）</p>
              <p className="mt-1 leading-none font-bold">
                <span className="text-5xl tabular-nums md:text-6xl">{formatMan(estimate.mid)}</span>
              </p>
              <p className="mt-3 text-white/85">
                幅：{formatMan(estimate.low)}〜{formatMan(estimate.high)}
              </p>
              <p className="mt-3 text-sm text-white/80">
                {estimate.scope === "district" ? `「${district}」付近` : "同じ市区町村"}の
                {typeInfo.label === "土地のみ" ? "土地" : typeInfo.label}の取引事例 {estimate.sampleCount}件
                {estimate.builtYearFiltered ? "（築年の近いもの）" : ""}から推定しました（{estimate.periodFrom}〜{estimate.periodTo}）。
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={applyToDiagnosis}
                  className="flex-1 rounded-full bg-sun px-6 py-4 font-bold text-ink transition hover:brightness-105"
                >
                  この価格で使い切り診断をする
                </button>
                <Link href="/consult" className="rounded-full border border-white/40 px-6 py-4 text-center font-bold transition hover:bg-white/10">
                  売却を相談する
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-line bg-white p-6 md:p-8">
              <h3 className="text-lg font-bold">推定の根拠にした事例（面積の近い順）</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <thead className="text-muted">
                    <tr className="border-b border-line">
                      <th className="py-2 font-normal">時期</th>
                      <th className="py-2 font-normal">地区</th>
                      <th className="py-2 text-right font-normal">面積</th>
                      {propertyType !== "land" && <th className="py-2 text-right font-normal">築年</th>}
                      <th className="py-2 text-right font-normal">価格</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {estimate.samples.map((s, i) => (
                      <tr key={i} className="border-b border-line/60 last:border-0">
                        <td className="py-2 whitespace-nowrap">{s.period.replace("第", " ").replace("四半期", "Q")}</td>
                        <td className="py-2">{s.district || "—"}</td>
                        <td className="py-2 text-right whitespace-nowrap">{s.area.toLocaleString()}㎡</td>
                        {propertyType !== "land" && <td className="py-2 text-right">{s.builtYear ?? "—"}</td>}
                        <td className="py-2 text-right font-bold whitespace-nowrap">{formatMan(s.price / 10000)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted">
                ※ 実際の取引価格・成約価格の事例から、㎡あたりの価格の中央値をもとに計算した概算です。個別の状態（日当たり・道路付け・リフォームの有無など）は反映していません。
              </p>
            </div>
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-line bg-white p-6 md:p-8">
            {status === "idle" || status === "loading" ? (
              <>
                <p className="text-lg font-bold">所在地と物件の情報を入れて「時価を推定する」を押してください</p>
                <p className="mt-2 text-muted">国土交通省が公開している、実際の取引事例をもとに推定します。</p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold">推定できませんでした</p>
                <p className="mt-2 text-muted">{ERROR_MESSAGES[status as keyof typeof ERROR_MESSAGES] ?? ERROR_MESSAGES.error}</p>
              </>
            )}
            {(citiesStatus === "not_configured" || status === "not_configured") && status !== "loading" && (
              <p className="mt-4 rounded-xl bg-sun-soft p-3 text-sm">{ERROR_MESSAGES.not_configured}</p>
            )}
          </div>
        )}

        <div className="rounded-3xl bg-pine-soft p-6">
          <p className="font-bold text-pine">売るか、貸すか、持ち続けるか</p>
          <p className="mt-2 text-sm text-muted">
            かんたん診断では、預貯金・証券が尽きる時期から逆算して「何歳までに売るか」をお伝えします。売却や住み替えのご相談も受け付けています。
          </p>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/quick" className="font-bold text-pine hover:underline">
              かんたん診断へ →
            </Link>
            <Link href="/consult" className="font-bold text-pine hover:underline">
              売却を相談する →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
