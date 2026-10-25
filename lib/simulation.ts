// かんたん診断用の使い切りシミュレーション（簡易版）。金額の単位はすべて「万円」。

export type QuickInput = {
  currentAge: number;
  lifeExpectancy: number; // 初期値 90
  financialAssets: number; // 現預金＋証券の合計
  monthlyPension: number; // 年金見込み（月額）
  pensionStartAge: number; // 初期値 65
  monthlyLivingCost: number; // 毎月の生活費
  safetyMargin: number; // 最期に残す最低額（医療・介護の予備費）
  expectedReturn: number; // 金融資産の想定利回り（年率）
  inflationRate: number; // 初期値 0.015
};

export type YearPoint = { age: number; balance: number };

export type QuickResult = {
  path: YearPoint[]; // 追加支出なしの推移
  plannedPath: YearPoint[]; // 「毎年あと使える額」を使った場合の推移
  finalBalance: number; // 追加支出なしで最期に残る見込み額
  extraAnnualSpend: number; // 毎年あと使える額
  depletionAge: number | null; // 追加支出なしで資産が尽きる年齢
};

export const DEFAULT_QUICK_INPUT: QuickInput = {
  currentAge: 60,
  lifeExpectancy: 90,
  financialAssets: 5000,
  monthlyPension: 22,
  pensionStartAge: 65,
  monthlyLivingCost: 26,
  safetyMargin: 500,
  expectedReturn: 0.02,
  inflationRate: 0.015,
};

/** 年単位で資産残高を推移計算する。extraAnnualSpend は毎年の追加支出（インフレ考慮なし）。 */
export function simulate(input: QuickInput, extraAnnualSpend = 0): YearPoint[] {
  const path: YearPoint[] = [{ age: input.currentAge, balance: input.financialAssets }];
  let balance = input.financialAssets;
  for (let age = input.currentAge; age < input.lifeExpectancy; age++) {
    const yearsFromNow = age - input.currentAge;
    const income = age >= input.pensionStartAge ? input.monthlyPension * 12 : 0;
    const livingCost = input.monthlyLivingCost * 12 * Math.pow(1 + input.inflationRate, yearsFromNow);
    const investmentGain = balance > 0 ? balance * input.expectedReturn : 0;
    balance = balance + income - livingCost - extraAnnualSpend + investmentGain;
    path.push({ age: age + 1, balance });
  }
  return path;
}

function isFeasible(input: QuickInput, extra: number): boolean {
  const path = simulate(input, extra);
  return path.every((p) => p.balance >= 0) && path[path.length - 1].balance >= input.safetyMargin;
}

/** 安全マージンを残しつつ、最期の残高がほぼゼロになる追加支出額を二分探索で求める。 */
export function findExtraAnnualSpend(input: QuickInput): number {
  if (!isFeasible(input, 0)) return 0;
  let low = 0;
  let high = Math.max(1, input.financialAssets + input.monthlyPension * 12);
  while (isFeasible(input, high)) high *= 2;
  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    if (isFeasible(input, mid)) low = mid;
    else high = mid;
  }
  return low;
}

export function runQuickDiagnosis(input: QuickInput): QuickResult {
  const path = simulate(input);
  const extraAnnualSpend = findExtraAnnualSpend(input);
  const depleted = path.find((p) => p.balance < 0);
  return {
    path,
    plannedPath: simulate(input, extraAnnualSpend),
    finalBalance: path[path.length - 1].balance,
    extraAnnualSpend,
    depletionAge: depleted ? depleted.age : null,
  };
}
