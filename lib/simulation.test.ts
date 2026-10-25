import { describe, expect, it } from "vitest";
import { DEFAULT_QUICK_INPUT, findExtraAnnualSpend, runQuickDiagnosis, simulate } from "./simulation";

describe("simulate", () => {
  it("現在年齢から想定寿命まで1年ごとの残高を返す", () => {
    const path = simulate(DEFAULT_QUICK_INPUT);
    expect(path[0]).toEqual({ age: 60, balance: 5000 });
    expect(path[path.length - 1].age).toBe(90);
    expect(path).toHaveLength(31);
  });

  it("利回り・インフレ0、年金なしなら単純に生活費分だけ減る", () => {
    const path = simulate({
      ...DEFAULT_QUICK_INPUT,
      currentAge: 80,
      lifeExpectancy: 82,
      financialAssets: 1000,
      monthlyPension: 0,
      monthlyLivingCost: 10,
      expectedReturn: 0,
      inflationRate: 0,
    });
    expect(path.map((p) => p.balance)).toEqual([1000, 880, 760]);
  });
});

describe("findExtraAnnualSpend", () => {
  it("使える額を使うと最期の残高が安全マージンに近づく", () => {
    const extra = findExtraAnnualSpend(DEFAULT_QUICK_INPUT);
    expect(extra).toBeGreaterThan(0);
    const path = simulate(DEFAULT_QUICK_INPUT, extra);
    expect(path[path.length - 1].balance).toBeCloseTo(DEFAULT_QUICK_INPUT.safetyMargin, 0);
    expect(path.every((p) => p.balance >= 0)).toBe(true);
  });

  it("資産が足りない場合は0を返し、尽きる年齢を示す", () => {
    const input = { ...DEFAULT_QUICK_INPUT, financialAssets: 300, monthlyPension: 10 };
    const result = runQuickDiagnosis(input);
    expect(result.extraAnnualSpend).toBe(0);
    expect(result.depletionAge).not.toBeNull();
  });

  it("年金以外の収入があると使える額が増え、受け取りは指定した年齢まで", () => {
    const withIncome = { ...DEFAULT_QUICK_INPUT, monthlyOtherIncome: 10, otherIncomeEndAge: 65 };
    expect(findExtraAnnualSpend(withIncome)).toBeGreaterThan(findExtraAnnualSpend(DEFAULT_QUICK_INPUT));
    const flat = { ...withIncome, monthlyPension: 0, monthlyLivingCost: 0, expectedReturn: 0, financialAssets: 0 };
    const path = simulate(flat);
    expect(path.find((p) => p.age === 65)?.balance).toBe(600);
    expect(path[path.length - 1].balance).toBe(600);
  });

  it("不動産は取り崩しに使わない", () => {
    const more = { ...DEFAULT_QUICK_INPUT, realEstateValue: 10000 };
    expect(findExtraAnnualSpend(more)).toBe(findExtraAnnualSpend(DEFAULT_QUICK_INPUT));
  });
});
