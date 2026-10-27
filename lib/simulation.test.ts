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
    relocationCost: 0,
    monthlyHousingAfterSale: 0,
  };

  it("現金が尽きる年の3年前を売却期限とし、諸費用・税を差し引いた額を現金に加える", () => {
    const { path, saleAge, cashRunOutAge } = simulatePlan({ ...flat, currentAge: 78, lifeExpectancy: 83, financialAssets: 490 }, 0, true);
    expect(cashRunOutAge).toBe(83);
    expect(saleAge).toBe(80);
    expect(path.map((p) => p.balance)).toEqual([490, 370, 1150, 1030, 910, 790]);
  });

  it("住み替えの一時費用を売却額から差し引き、売却の翌年から住居費がかかる", () => {
    const input = { ...flat, currentAge: 78, lifeExpectancy: 83, financialAssets: 490, relocationCost: 100, monthlyHousingAfterSale: 5 };
    const { path, saleAge } = simulatePlan(input, 0, true);
    expect(saleAge).toBe(80);
    // 80歳で 900−100=800 を受け取り、81歳以降は生活費120＋住居費60が毎年かかる
    expect(path.map((p) => p.balance)).toEqual([490, 370, 1050, 870, 690, 510]);
  });

  it("売却期限が今より前になる場合は、来年を期限にする", () => {
    const { saleAge, cashRunOutAge } = simulatePlan(flat, 0, true);
    expect(cashRunOutAge).toBe(83);
    expect(saleAge).toBe(81);
  });

  it("売却を前提にすると使える額が増え、売却が必要な年齢が分かる", () => {
    const r = runQuickDiagnosis(DEFAULT_QUICK_INPUT);
    expect(r.extraAnnualSpend).toBeGreaterThan(r.extraAnnualSpendWithoutSale);
    expect(r.saleAge).not.toBeNull();
    // 売却年が1年ずれると住居費の年数も変わるため、ちょうどではなく「少し上」に収まる
    const final = r.plannedPath[r.plannedPath.length - 1].balance;
    expect(final).toBeGreaterThanOrEqual(DEFAULT_QUICK_INPUT.safetyMargin);
    expect(final).toBeLessThan(DEFAULT_QUICK_INPUT.safetyMargin + 100);
  });

  it("売らないと残しておきたい額を割り込む場合は、その年齢から逆算して売却期限を示す", () => {
    const input = { ...DEFAULT_QUICK_INPUT, financialAssets: 1500, realEstateValue: 300 };
    const r = runQuickDiagnosis(input);
    expect(r.extraAnnualSpend).toBe(0);
    expect(r.cashDepletionAge).not.toBeNull();
    // 0円になる（cashDepletionAge）より前に、残しておきたい額を割り込む
    const belowReserve = simulate(input).find((p) => p.balance < input.safetyMargin)!.age;
    expect(r.cashRunOutAge).toBe(belowReserve);
    expect(r.cashRunOutAge!).toBeLessThanOrEqual(r.cashDepletionAge!);
    expect(r.saleAge).toBe(Math.max(input.currentAge + 1, belowReserve - 3));
  });

  it("0円と残しておきたい額の間で止まる使い方でも、売却を前提にした最大の額を見つける", () => {
    // 以前は、残高が0円を下回らないと売却しなかったため、この条件で使える額を少なく見積もっていた
    const input = { ...DEFAULT_QUICK_INPUT, currentAge: 70, financialAssets: 4000, realEstateValue: 4200, relocationCost: 200, monthlyHousingAfterSale: 8 };
    const found = findExtraAnnualSpend(input, true);
    const feasible = (e: number) => {
      const { path } = simulatePlan(input, e, true);
      return path.every((p) => p.balance >= 0) && path[path.length - 1].balance >= input.safetyMargin;
    };
    expect(feasible(found)).toBe(true);
    // 0〜500万円を細かく調べて、実現できる額のうち見つけた額を大きく超えるものはない
    for (let e = 0; e <= 500; e += 5) if (feasible(e)) expect(e).toBeLessThanOrEqual(found + 5);
    expect(found).toBeGreaterThan(200);
  });

  it("住み替え費用が売却額を上回る場合は売却を計画に入れない", () => {
    const r = runQuickDiagnosis({ ...DEFAULT_QUICK_INPUT, relocationCost: 5000 });
    expect(r.saleAge).toBeNull();
    expect(r.extraAnnualSpend).toBeCloseTo(r.extraAnnualSpendWithoutSale, 6);
  });
});
