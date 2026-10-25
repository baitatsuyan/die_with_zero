// かんたん診断用の使い切りシミュレーション（簡易版）。金額の単位はすべて「万円」。

export type QuickInput = {
  currentAge: number;
  lifeExpectancy: number; // 初期値 90
  financialAssets: number; // 現預金＋証券の合計
  realEstateValue: number; // 不動産の時価の合計（現金が尽きる年までに売却する前提）
  monthlyPension: number; // 年金見込み（月額）
  pensionStartAge: number; // 初期値 65
  monthlyOtherIncome: number; // 年金以外の収入（月額）：就労収入・家賃収入など
  otherIncomeEndAge: number; // 年金以外の収入を受け取る最後の年齢
  monthlyLivingCost: number; // 毎月の生活費
  safetyMargin: number; // 最期に残す最低額（医療・介護の予備費）
  expectedReturn: number; // 金融資産の想定利回り（年率）
  inflationRate: number; // 初期値 0.015
};

export type YearPoint = { age: number; balance: number };

export type QuickResult = {
  path: YearPoint[]; // 追加支出なしの推移（現金が尽きる年に不動産を売却）
  plannedPath: YearPoint[]; // 「毎年あと使える額」を使った場合の推移
  finalBalance: number; // 追加支出なしで最期に残る見込み額
  extraAnnualSpend: number; // 毎年あと使える額（必要になったら不動産を売却する前提）
  extraAnnualSpendWithoutSale: number; // 不動産を売らずに暮らす場合の毎年あと使える額
  saleAge: number | null; // 使い切りプランで不動産の売却が必要になる年齢（この年齢までに売る）
  saleProceeds: number; // 売却で手元に残る額の目安（諸費用・税を簡易控除）
  cashDepletionAge: number | null; // 追加支出なし・売却なしで現金が尽きる年齢
  depletionAge: number | null; // 追加支出なしで、売却しても資産が尽きる年齢
};

/** 売却時の諸費用・税（仲介手数料・譲渡所得税など）として差し引く割合の目安。 */
export const SALE_COST_RATE = 0.1;

export const DEFAULT_QUICK_INPUT: QuickInput = {
  currentAge: 60,
  lifeExpectancy: 90,
  financialAssets: 5000,
  realEstateValue: 2350,
  monthlyPension: 22,
  pensionStartAge: 65,
  monthlyOtherIncome: 0,
  otherIncomeEndAge: 65,
  monthlyLivingCost: 26,
  safetyMargin: 500,
  expectedReturn: 0.02,
  inflationRate: 0.015,
};

export type Simulation = { path: YearPoint[]; saleAge: number | null };

/**
 * 年単位で現金（預貯金・証券）の残高を推移計算する。extraAnnualSpend は毎年の追加支出（インフレ考慮なし）。
 * allowSale が true なら、現金が尽きる年に不動産を売却し、売却額（諸費用・税を差し引いた額）を現金に加える。
 */
export function simulatePlan(input: QuickInput, extraAnnualSpend = 0, allowSale = false): Simulation {
  const path: YearPoint[] = [{ age: input.currentAge, balance: input.financialAssets }];
  let balance = input.financialAssets;
  let saleAge: number | null = null;
  for (let age = input.currentAge; age < input.lifeExpectancy; age++) {
    const yearsFromNow = age - input.currentAge;
    const pension = age >= input.pensionStartAge ? input.monthlyPension * 12 : 0;
    const otherIncome = age < input.otherIncomeEndAge ? input.monthlyOtherIncome * 12 : 0;
    const income = pension + otherIncome;
    const livingCost = input.monthlyLivingCost * 12 * Math.pow(1 + input.inflationRate, yearsFromNow);
    const investmentGain = balance > 0 ? balance * input.expectedReturn : 0;
    balance = balance + income - livingCost - extraAnnualSpend + investmentGain;
    if (allowSale && saleAge === null && balance < 0 && input.realEstateValue > 0) {
      balance += input.realEstateValue * (1 - SALE_COST_RATE);
      saleAge = age + 1;
    }
    path.push({ age: age + 1, balance });
  }
  return { path, saleAge };
}

/** 売却を考えない資産推移。 */
export function simulate(input: QuickInput, extraAnnualSpend = 0): YearPoint[] {
  return simulatePlan(input, extraAnnualSpend).path;
}

function isFeasible(input: QuickInput, extra: number, allowSale: boolean): boolean {
  const { path } = simulatePlan(input, extra, allowSale);
  return path.every((p) => p.balance >= 0) && path[path.length - 1].balance >= input.safetyMargin;
}

/** 安全マージンを残しつつ、最期の残高がほぼゼロになる追加支出額を二分探索で求める。 */
export function findExtraAnnualSpend(input: QuickInput, allowSale = false): number {
  if (!isFeasible(input, 0, allowSale)) return 0;
  let low = 0;
  let high = Math.max(1, input.financialAssets + input.realEstateValue + input.monthlyPension * 12);
  while (isFeasible(input, high, allowSale)) high *= 2;
  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    if (isFeasible(input, mid, allowSale)) low = mid;
    else high = mid;
  }
  return low;
}

const firstNegativeAge = (path: YearPoint[]) => path.find((p) => p.balance < 0)?.age ?? null;

export function runQuickDiagnosis(input: QuickInput): QuickResult {
  const hasRealEstate = input.realEstateValue > 0;
  const base = simulatePlan(input, 0, true);
  const extraAnnualSpendWithoutSale = findExtraAnnualSpend(input, false);
  const extraAnnualSpend = hasRealEstate ? findExtraAnnualSpend(input, true) : extraAnnualSpendWithoutSale;
  const planned = simulatePlan(input, extraAnnualSpend, true);
  return {
    path: base.path,
    plannedPath: planned.path,
    finalBalance: base.path[base.path.length - 1].balance,
    extraAnnualSpend,
    extraAnnualSpendWithoutSale,
    // 使える額が0のとき（使い切りプランが組めないとき）は、追加支出なしで現金が尽きる年が売却の期限
    saleAge: extraAnnualSpend > 0 ? planned.saleAge : base.saleAge,
    saleProceeds: input.realEstateValue * (1 - SALE_COST_RATE),
    cashDepletionAge: firstNegativeAge(simulate(input)),
    depletionAge: firstNegativeAge(base.path),
  };
}
