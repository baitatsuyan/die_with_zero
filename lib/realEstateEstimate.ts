// 不動産情報ライブラリの取引事例から、不動産の時価を推定する（簡易版）。
// API呼び出しは lib/reinfolib.ts（サーバー側）で行い、ここは純粋関数だけを置く。

export type PropertyType = "land" | "house" | "condo";

export const PROPERTY_TYPES: { value: PropertyType; label: string; areaLabel: string }[] = [
  { value: "house", label: "戸建て", areaLabel: "土地の面積" },
  { value: "condo", label: "マンション", areaLabel: "専有面積" },
  { value: "land", label: "土地のみ", areaLabel: "土地の面積" },
];

// APIの「取引の種類（Type）」との対応
const TYPE_LABELS: Record<PropertyType, string> = {
  land: "宅地(土地)",
  house: "宅地(土地と建物)",
  condo: "中古マンション等",
};

/** APIが返す取引事例（必要な項目だけ。値はすべて文字列で返る）。 */
export type RawTransaction = {
  Type?: string;
  DistrictName?: string;
  TradePrice?: string;
  Area?: string;
  BuildingYear?: string;
  Period?: string;
  FloorPlan?: string;
  PriceCategory?: string;
};

export type Transaction = {
  type: string;
  district: string;
  price: number; // 円
  area: number; // ㎡
  builtYear: number | null;
  period: string;
  floorPlan: string;
};

export type EstimateInput = {
  propertyType: PropertyType;
  areaSqm: number;
  builtYear?: number | null;
  district?: string;
};

export type Estimate = {
  low: number; // 万円
  mid: number; // 万円
  high: number; // 万円
  sampleCount: number;
  scope: "district" | "city"; // 地区で絞り込めたか
  builtYearFiltered: boolean; // 築年の近い事例に絞り込めたか
  periodFrom: string;
  periodTo: string;
  samples: Transaction[]; // 根拠として見せる事例（面積の近い順）
};

/** 推定に必要な最低件数。これより少なければ推定しない。 */
export const MIN_SAMPLES = 3;
/** 地区・築年で絞り込むときに必要な件数。 */
const NARROW_MIN = 5;
const BUILT_YEAR_RANGE = 10;

/** 「1972年」「昭和60年」「平成5年」「令和2年」などを西暦にする。「戦前」などは null。 */
export function parseBuiltYear(s: string | undefined): number | null {
  if (!s) return null;
  const western = s.match(/^(\d{4})年?$/);
  if (western) return Number(western[1]);
  const era = s.match(/^(昭和|平成|令和)(元|\d+)年$/);
  if (era) {
    const n = era[2] === "元" ? 1 : Number(era[2]);
    return { 昭和: 1925, 平成: 1988, 令和: 2018 }[era[1] as "昭和" | "平成" | "令和"] + n;
  }
  return null;
}

/** 「80」「2000㎡以上」「2,000」などを数値にする。 */
export function parseArea(s: string | undefined): number {
  if (!s) return NaN;
  const m = s.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : NaN;
}

export function parseTransaction(raw: RawTransaction): Transaction | null {
  const price = Number((raw.TradePrice ?? "").replace(/,/g, ""));
  const area = parseArea(raw.Area);
  if (!raw.Type || !Number.isFinite(price) || price <= 0 || !Number.isFinite(area) || area <= 0) return null;
  return {
    type: raw.Type,
    district: raw.DistrictName ?? "",
    price,
    area,
    builtYear: parseBuiltYear(raw.BuildingYear),
    period: raw.Period ?? "",
    floorPlan: raw.FloorPlan ?? "",
  };
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

// 「2024年第1四半期」を並べ替えられる数値にする
const periodKey = (p: string) => {
  const m = p.match(/(\d{4})年第(\d)四半期/);
  return m ? Number(m[1]) * 10 + Number(m[2]) : 0;
};

/**
 * 種類が同じ取引事例の「㎡あたり価格」の中央値に面積を掛けて推定する。
 * 下限・上限は25%・75%の位置の値。事例が十分にあれば、地区と築年（±10年）で絞り込む。
 */
export function estimateValue(input: EstimateInput, transactions: Transaction[]): Estimate | null {
  let pool = transactions.filter((t) => t.type === TYPE_LABELS[input.propertyType]);
  if (pool.length < MIN_SAMPLES) return null;

  let scope: Estimate["scope"] = "city";
  const district = input.district?.trim();
  if (district) {
    const inDistrict = pool.filter((t) => t.district !== "" && (t.district.includes(district) || district.includes(t.district)));
    if (inDistrict.length >= NARROW_MIN) {
      pool = inDistrict;
      scope = "district";
    }
  }

  let builtYearFiltered = false;
  if (input.propertyType !== "land" && input.builtYear) {
    const near = pool.filter((t) => t.builtYear !== null && Math.abs(t.builtYear - input.builtYear!) <= BUILT_YEAR_RANGE);
    if (near.length >= NARROW_MIN) {
      pool = near;
      builtYearFiltered = true;
    }
  }

  const unitPrices = pool.map((t) => t.price / t.area).sort((a, b) => a - b);
  const toMan = (unit: number) => Math.round((unit * input.areaSqm) / 10000);
  const periods = pool.map((t) => t.period).filter(Boolean).sort((a, b) => periodKey(a) - periodKey(b));
  const samples = [...pool].sort((a, b) => Math.abs(a.area - input.areaSqm) - Math.abs(b.area - input.areaSqm)).slice(0, 5);

  return {
    low: toMan(quantile(unitPrices, 0.25)),
    mid: toMan(quantile(unitPrices, 0.5)),
    high: toMan(quantile(unitPrices, 0.75)),
    sampleCount: pool.length,
    scope,
    builtYearFiltered,
    periodFrom: periods[0] ?? "",
    periodTo: periods[periods.length - 1] ?? "",
    samples,
  };
}
