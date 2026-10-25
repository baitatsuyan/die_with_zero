import { describe, expect, it } from "vitest";
import { estimateValue, parseArea, parseBuiltYear, parseTransaction, type Transaction } from "./realEstateEstimate";

const condo = (district: string, priceMan: number, area: number, builtYear: number | null, period = "2025年第1四半期"): Transaction => ({
  type: "中古マンション等",
  district,
  price: priceMan * 10000,
  area,
  builtYear,
  period,
  floorPlan: "",
});

describe("parse", () => {
  it("建築年を西暦にする", () => {
    expect(parseBuiltYear("1972年")).toBe(1972);
    expect(parseBuiltYear("昭和60年")).toBe(1985);
    expect(parseBuiltYear("平成元年")).toBe(1989);
    expect(parseBuiltYear("令和2年")).toBe(2020);
    expect(parseBuiltYear("戦前")).toBeNull();
    expect(parseBuiltYear(undefined)).toBeNull();
  });

  it("面積の表記ゆれを数値にする", () => {
    expect(parseArea("80")).toBe(80);
    expect(parseArea("2000㎡以上")).toBe(2000);
    expect(parseArea("1,500")).toBe(1500);
    expect(parseArea("")).toBeNaN();
  });

  it("価格や面積が読めない事例は除く", () => {
    expect(parseTransaction({ Type: "宅地(土地)", TradePrice: "30000000", Area: "100", Period: "2025年第2四半期" })).toMatchObject({
      price: 30000000,
      area: 100,
    });
    expect(parseTransaction({ Type: "宅地(土地)", TradePrice: "", Area: "100" })).toBeNull();
    expect(parseTransaction({ Type: "宅地(土地)", TradePrice: "100", Area: "非公開" })).toBeNull();
  });
});

describe("estimateValue", () => {
  // ㎡単価 50, 60, 70, 80, 90万円 の5件
  const base = [50, 60, 70, 80, 90].map((u, i) => condo(i < 2 ? "日本橋" : "月島", u * 70, 70, 2000 + i));

  it("㎡単価の中央値×面積で推定し、25%〜75%を幅として返す", () => {
    const r = estimateValue({ propertyType: "condo", areaSqm: 70 }, base)!;
    expect(r.mid).toBe(4900);
    expect(r.low).toBe(4200);
    expect(r.high).toBe(5600);
    expect(r.sampleCount).toBe(5);
    expect(r.scope).toBe("city");
  });

  it("種類が違う事例は使わず、件数が足りなければ推定しない", () => {
    const land = base.map((t) => ({ ...t, type: "宅地(土地)" }));
    expect(estimateValue({ propertyType: "condo", areaSqm: 70 }, [...land, ...base.slice(0, 2)])).toBeNull();
  });

  it("地区の事例が5件以上あれば地区で絞り込む", () => {
    const more = [...base, ...[100, 100, 100, 100, 100].map((u) => condo("日本橋", u * 70, 70, 2010))];
    const r = estimateValue({ propertyType: "condo", areaSqm: 70, district: "日本橋" }, more)!;
    expect(r.scope).toBe("district");
    expect(r.sampleCount).toBe(7);
  });

  it("地区名が空の事例は、地区の絞り込みに含めない", () => {
    const noDistrict = base.map((t) => ({ ...t, district: "" }));
    const r = estimateValue({ propertyType: "condo", areaSqm: 70, district: "日本橋" }, noDistrict)!;
    expect(r.scope).toBe("city");
  });

  it("築年が近い事例が5件以上あれば築年で絞り込む", () => {
    const old = [10, 10, 10].map((u) => condo("月島", u * 70, 70, 1975));
    const r = estimateValue({ propertyType: "condo", areaSqm: 70, builtYear: 2003 }, [...base, ...old])!;
    expect(r.builtYearFiltered).toBe(true);
    expect(r.sampleCount).toBe(5);
    expect(r.mid).toBe(4900);
  });

  it("根拠の期間を古い順に返す", () => {
    const mixed = base.map((t, i) => ({ ...t, period: ["2025年第3四半期", "2024年第1四半期", "2025年第1四半期", "2024年第4四半期", "2026年第1四半期"][i] }));
    const r = estimateValue({ propertyType: "condo", areaSqm: 70 }, mixed)!;
    expect(r.periodFrom).toBe("2024年第1四半期");
    expect(r.periodTo).toBe("2026年第1四半期");
  });
});
