// 相続税の概算（簡易版）。金額の単位はすべて「万円」。
// 端数処理や小規模宅地等の特例などは考慮しない。正確な額は税理士への相談が前提。

export type InheritanceInput = {
  estate: number; // 遺産総額（不動産時価込み、死亡保険金を除く）
  liabilities: number; // 負債
  deathBenefit: number; // 死亡保険金
  hasSpouse: boolean;
  childrenCount: number;
  /** 配偶者が実際に取得する額。省略時は法定相続分どおりに取得したものとする。 */
  spouseAcquisition?: number;
};

export type InheritanceResult = {
  heirsCount: number; // 法定相続人の数
  insuranceExemption: number; // 死亡保険金の非課税枠（適用額）
  taxablePrice: number; // 課税価格
  basicDeduction: number; // 基礎控除
  taxableEstate: number; // 課税遺産総額
  totalTax: number; // 相続税の総額（配偶者の税額軽減前）
  spouseReduction: number; // 配偶者の税額軽減
  payableTax: number; // 納める相続税の合計（概算）
};

// 相続税の速算表（法定相続分に応じた取得金額の上限, 税率, 控除額）
const BRACKETS: [number, number, number][] = [
  [1000, 0.1, 0],
  [3000, 0.15, 50],
  [5000, 0.2, 200],
  [10000, 0.3, 700],
  [20000, 0.4, 1700],
  [30000, 0.45, 2700],
  [60000, 0.5, 4200],
  [Infinity, 0.55, 7200],
];

/** 法定相続分に応じた取得金額に対する税額を速算表で求める。 */
export function taxForShare(amount: number): number {
  if (amount <= 0) return 0;
  const [, rate, deduction] = BRACKETS.find(([limit]) => amount <= limit)!;
  return amount * rate - deduction;
}

/** 配偶者と子だけを相続人とみなした法定相続分。子も配偶者もいない場合は1人が全部を相続する扱い。 */
export function legalShares(hasSpouse: boolean, childrenCount: number): { spouse: number; child: number } {
  if (childrenCount === 0) return { spouse: hasSpouse ? 1 : 0, child: 0 };
  if (!hasSpouse) return { spouse: 0, child: 1 / childrenCount };
  return { spouse: 1 / 2, child: 1 / 2 / childrenCount };
}

export function calculateInheritanceTax(input: InheritanceInput): InheritanceResult {
  const { hasSpouse, childrenCount } = input;
  const heirsCount = (hasSpouse ? 1 : 0) + childrenCount;
  const shares = legalShares(hasSpouse, childrenCount);

  const insuranceExemption = Math.min(input.deathBenefit, 500 * heirsCount);
  const taxablePrice = Math.max(0, input.estate + input.deathBenefit - input.liabilities - insuranceExemption);
  const basicDeduction = 3000 + 600 * heirsCount;
  const taxableEstate = Math.max(0, taxablePrice - basicDeduction);

  const totalTax =
    heirsCount === 0
      ? taxForShare(taxableEstate)
      : (hasSpouse ? taxForShare(taxableEstate * shares.spouse) : 0) +
        childrenCount * taxForShare(taxableEstate * shares.child);

  // 配偶者の税額軽減：配偶者の取得分のうち「1億6,000万円」と「法定相続分」の多い方までは非課税
  let spouseReduction = 0;
  if (hasSpouse && taxablePrice > 0) {
    const acquisition = input.spouseAcquisition ?? taxablePrice * shares.spouse;
    const exemptAmount = Math.min(acquisition, Math.max(16000, taxablePrice * shares.spouse));
    spouseReduction = Math.min(totalTax, (totalTax * exemptAmount) / taxablePrice);
  }

  return {
    heirsCount,
    insuranceExemption,
    taxablePrice,
    basicDeduction,
    taxableEstate,
    totalTax,
    spouseReduction,
    payableTax: totalTax - spouseReduction,
  };
}
