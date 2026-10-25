// かんたん診断用の使い切りシミュレーション（簡易版）。金額の単位はすべて「万円」。

export type QuickInput = {
  currentAge: number;
  lifeExpectancy: number; // 初期値 90
  financialAssets: number; // 現預金＋証券の合計
  realEstateValue: number; // 不動産の時価の合計（現金が尽きる年までに売却する前提）
  relocationCost: number; // 売却時の住み替えの一時費用（引越し・賃貸の初期費用・購入費・入居一時金など）
  monthlyHousingAfterSale: number; // 売却後の住居費（月額）：家賃・管理費など
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
  saleAge: number | null; // 売却期限（現金が尽きる年の SALE_LEAD_YEARS 年前）。計算もこの年齢で売却した場合
  cashRunOutAge: number | null; // 売却しなければ現金が尽きる年齢
  saleProceeds: number; // 売却で手元に残る額の目安（諸費用・税と住み替えの一時費用を差し引いた額）
  cashDepletionAge: number | null; // 追加支出なし・売却なしで現金が尽きる年齢
  depletionAge: number | null; // 追加支出なしで、売却しても資産が尽きる年齢
};

/** 売却時の諸費用・税（仲介手数料・譲渡所得税など）として差し引く割合の目安。 */
export const SALE_COST_RATE = 0.1;

/** 売却には時間がかかるため、現金が尽きる何年前を売却期限とするか。 */
export const SALE_LEAD_YEARS = 3;

export const DEFAULT_QUICK_INPUT: QuickInput = {
  currentAge: 60,
  lifeExpectancy: 90,
  financialAssets: 5000,
  realEstateValue: 2350,
  relocationCost: 200,
  monthlyHousingAfterSale: 8,
  monthlyPension: 22,
  pensionStartAge: 65,
  monthlyOtherIncome: 0,
  otherIncomeEndAge: 65,
  monthlyLivingCost: 26,
  safetyMargin: 500,
  expectedReturn: 0.02,
  inflationRate: 0.015,
};

export type Simulation = { path: YearPoint[]; saleAge: number | null; cashRunOutAge: number | null };

/** 売却で手元に残る額：時価から諸費用・税（1割）と住み替えの一時費用を差し引いた額。 */
export function netSaleProceeds(input: QuickInput): number {
  return input.realEstateValue * (1 - SALE_COST_RATE) - input.relocationCost;
}

/** 年単位で現金（預貯金・証券）の残高を推移計算する。saleAt の年齢になった時点で不動産を売却する。 */
function runCashFlow(input: QuickInput, extraAnnualSpend: number, saleAt: number | "whenNeeded" | null) {
  const path: YearPoint[] = [{ age: input.currentAge, balance: input.financialAssets }];
  const proceeds = netSaleProceeds(input);
  let balance = input.financialAssets;
  let soldAt: number | null = null;
  for (let age = input.currentAge; age < input.lifeExpectancy; age++) {
    const yearsFromNow = age - input.currentAge;
    const pension = age >= input.pensionStartAge ? input.monthlyPension * 12 : 0;
    const otherIncome = age < input.otherIncomeEndAge ? input.monthlyOtherIncome * 12 : 0;
    const income = pension + otherIncome;
    const livingCost = input.monthlyLivingCost * 12 * Math.pow(1 + input.inflationRate, yearsFromNow);
    // 売却した翌年から、住み替え先の住居費がかかる
    const housingAfterSale =
      soldAt !== null ? input.monthlyHousingAfterSale * 12 * Math.pow(1 + input.inflationRate, yearsFromNow) : 0;
    const investmentGain = balance > 0 ? balance * input.expectedReturn : 0;
    balance = balance + income - livingCost - housingAfterSale - extraAnnualSpend + investmentGain;
    const sellNow = saleAt === "whenNeeded" ? balance < 0 : saleAt === age + 1;
    if (soldAt === null && sellNow && input.realEstateValue > 0) {
      balance += proceeds;
      soldAt = age + 1;
    }
    path.push({ age: age + 1, balance });
  }
  return { path, soldAt };
}

/**
 * 年単位で現金（預貯金・証券）の残高を推移計算する。extraAnnualSpend は毎年の追加支出（インフレ考慮なし）。
 * allowSale が true なら、現金が尽きる年の SALE_LEAD_YEARS 年前に不動産を売却し、
 * 売却額（諸費用・税を差し引いた額）を現金に加える。
 */
export function simulatePlan(input: QuickInput, extraAnnualSpend = 0, allowSale = false): Simulation {
  // 住み替え費用が売却額を上回るなら、売っても資金は増えないので売却しない
  if (!allowSale || input.realEstateValue <= 0 || netSaleProceeds(input) <= 0) {
    return { path: runCashFlow(input, extraAnnualSpend, null).path, saleAge: null, cashRunOutAge: null };
  }
  const cashRunOutAge = runCashFlow(input, extraAnnualSpend, "whenNeeded").soldAt;
  if (cashRunOutAge === null) return { path: runCashFlow(input, extraAnnualSpend, null).path, saleAge: null, cashRunOutAge: null };
  const saleAge = Math.max(input.currentAge + 1, cashRunOutAge - SALE_LEAD_YEARS);
  return { path: runCashFlow(input, extraAnnualSpend, saleAge).path, saleAge, cashRunOutAge };
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
  const hasRealEstate = input.realEstateValue > 0 && netSaleProceeds(input) > 0;
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
    cashRunOutAge: extraAnnualSpend > 0 ? planned.cashRunOutAge : base.cashRunOutAge,
    saleProceeds: netSaleProceeds(input),
    cashDepletionAge: firstNegativeAge(simulate(input)),
    depletionAge: firstNegativeAge(base.path),
  };
}
