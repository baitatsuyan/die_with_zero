import { describe, expect, it } from "vitest";
import { newClientPlan, nextActions, sellableValue, summarizePlan, toQuickInput, type ClientRealEstate } from "./clientPlan";

const property = (value: number, policy: ClientRealEstate["policy"]): ClientRealEstate => ({
  id: String(value),
  label: "実家",
  propertyType: "house",
  prefecture: "東京都",
  city: "中央区",
  district: "",
  use: "parents_home",
  value,
  policy,
});

describe("toQuickInput", () => {
  it("生年から年齢を出し、預貯金と証券を合算する", () => {
    const q = toQuickInput({ ...newClientPlan("山田", 1962), cash: 2000, securities: 1500 }, 2026);
    expect(q.currentAge).toBe(64);
    expect(q.financialAssets).toBe(3500);
  });

  it("方針が「売る」「未定」の不動産だけを売却の対象にする", () => {
    const plan = { ...newClientPlan("山田", 1962), realEstates: [property(3000, "keep"), property(2000, "sell"), property(500, "undecided"), property(800, "give")] };
    expect(sellableValue(plan)).toBe(2500);
    expect(toQuickInput(plan, 2026).realEstateValue).toBe(2500);
  });
});

describe("summarizePlan", () => {
  it("純資産・相続税の目安・未定の件数をまとめる", () => {
    const plan = {
      ...newClientPlan("山田", 1962),
      cash: 4000,
      securities: 3000,
      liabilities: 500,
      realEstates: [property(5000, "keep"), property(2000, "undecided")],
    };
    const s = summarizePlan(plan, 2026);
    expect(s.netWorth).toBe(13500);
    // 遺産 14,000万円 − 負債 500 = 課税価格 13,500万円、配偶者と子2人
    expect(s.taxNow.taxablePrice).toBe(13500);
    expect(s.taxNow.payableTax).toBeGreaterThan(0);
    expect(s.undecidedCount).toBe(1);
  });
});

describe("nextActions", () => {
  it("未定の不動産と相続税を「次にやること」に挙げる", () => {
    const plan = { ...newClientPlan("山田", 1962), cash: 8000, securities: 4000, realEstates: [property(6000, "undecided")] };
    const actions = nextActions(plan, summarizePlan(plan, 2026));
    expect(actions[0]).toContain("実家の方針");
    expect(actions.some((a) => a.includes("税理士"))).toBe(true);
    expect(actions.length).toBeLessThanOrEqual(3);
  });
});
