import { describe, expect, it } from "vitest";
import { DEFAULT_QUICK_INPUT, findExtraAnnualSpend, runQuickDiagnosis, simulate, simulatePlan } from "./simulation";

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

  it("不動産は売却を前提にしない場合は使える額に影響しない", () => {
    const more = { ...DEFAULT_QUICK_INPUT, realEstateValue: 10000 };
    expect(findExtraAnnualSpend(more, false)).toBeCloseTo(findExtraAnnualSpend(DEFAULT_QUICK_INPUT, false), 6);
  });
});

describe("不動産の売却", () => {
  const flat = {
    ...DEFAULT_QUICK_INPUT,
    currentAge: 80,
    lifeExpectancy: 85,
    financialAssets: 250,
    realEstateValue: 1000,
    monthlyPension: 0,
    monthlyOtherIncome: 0,
    monthlyLivingCost: 10,
    expectedReturn: 0,
    inflationRate: 0,
    safetyMargin: 0,
  };

  it("現金が尽きる年に売却し、諸費用・税を差し引いた額を現金に加える", () => {
    const { path, saleAge } = simulatePlan(flat, 0, true);
    expect(saleAge).toBe(83);
    expect(path.map((p) => p.balance)).toEqual([250, 130, 10, 790, 670, 550]);
  });

  it("売却を前提にすると使える額が増え、売却が必要な年齢が分かる", () => {
    const r = runQuickDiagnosis(DEFAULT_QUICK_INPUT);
    expect(r.extraAnnualSpend).toBeGreaterThan(r.extraAnnualSpendWithoutSale);
    expect(r.saleAge).not.toBeNull();
    expect(r.plannedPath[r.plannedPath.length - 1].balance).toBeCloseTo(DEFAULT_QUICK_INPUT.safetyMargin, 0);
  });

  it("売らないと現金が尽きる場合は、その年齢を売却の期限として示す", () => {
    const r = runQuickDiagnosis({ ...DEFAULT_QUICK_INPUT, financialAssets: 1500, realEstateValue: 300 });
    expect(r.extraAnnualSpend).toBe(0);
    expect(r.cashDepletionAge).not.toBeNull();
    expect(r.saleAge).toBe(r.cashDepletionAge);
  });
});
