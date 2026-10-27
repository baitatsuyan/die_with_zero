// 事務所が顧客と一緒につくる計画（仕様書v2の ClientPlan を、いまの計算に合わせて簡略化したもの）。
// 金額の単位はすべて「万円」。計算は既存の simulation / inheritanceTax をそのまま使う。

import { calculateInheritanceTax, type InheritanceResult } from "@/lib/inheritanceTax";
import type { PropertyType } from "@/lib/realEstateEstimate";
import { DEFAULT_QUICK_INPUT, runQuickDiagnosis, type QuickInput, type QuickResult } from "@/lib/simulation";

export type PropertyUse = "home" | "parents_home" | "rental" | "vacant";
export type PropertyPolicy = "keep" | "sell" | "rent" | "give" | "undecided";

export type ClientRealEstate = {
  id: string;
  label: string; // 例：自宅、実家
  propertyType: PropertyType;
  prefecture: string;
  city: string;
  district: string;
  use: PropertyUse;
  value: number; // 時価の目安
  policy: PropertyPolicy;
};

export type ClientPlan = {
  name: string;
  birthYear: number;
  lifeExpectancy: number;
  hasSpouse: boolean;
  childrenCount: number;
  pensionMonthly: number; // 夫婦合計
  otherIncomeMonthly: number;
  otherIncomeEndAge: number;
  monthlyLivingCost: number;
  safetyMargin: number;
  cash: number;
  securities: number;
  deathBenefit: number;
  liabilities: number;
  realEstates: ClientRealEstate[];
  relocationCost: number;
  monthlyHousingAfterSale: number;
  memo: string; // 事務所内のメモ（提案書には出さない）
  proposalNote: string; // 提案書に載せる、事務所からのコメント
};

export const POLICY_LABELS: Record<PropertyPolicy, string> = {
  keep: "住み続ける",
  sell: "売る",
  rent: "貸す",
  give: "子に渡す",
  undecided: "未定",
};

export const USE_LABELS: Record<PropertyUse, string> = {
  home: "自宅",
  parents_home: "実家",
  rental: "賃貸中",
  vacant: "空き家・空き地",
};

/** 使い切り計画で、預貯金が足りなくなる前に売却する対象にする方針。 */
const SELLABLE: PropertyPolicy[] = ["sell", "undecided"];

export function newClientPlan(name: string, birthYear: number): ClientPlan {
  return {
    name,
    birthYear,
    lifeExpectancy: 90,
    hasSpouse: true,
    childrenCount: 2,
    pensionMonthly: 22,
    otherIncomeMonthly: 0,
    otherIncomeEndAge: 65,
    monthlyLivingCost: 26,
    safetyMargin: 500,
    cash: 2000,
    securities: 1000,
    deathBenefit: 0,
    liabilities: 0,
    realEstates: [],
    relocationCost: 200,
    monthlyHousingAfterSale: 8,
    memo: "",
    proposalNote: "",
  };
}

export const ageOf = (plan: ClientPlan, year = new Date().getFullYear()) => year - plan.birthYear;

export const sellableValue = (plan: ClientPlan) =>
  plan.realEstates.filter((r) => SELLABLE.includes(r.policy)).reduce((sum, r) => sum + r.value, 0);

export const totalRealEstateValue = (plan: ClientPlan) => plan.realEstates.reduce((sum, r) => sum + r.value, 0);

export function toQuickInput(plan: ClientPlan, year = new Date().getFullYear()): QuickInput {
  return {
    ...DEFAULT_QUICK_INPUT,
    currentAge: ageOf(plan, year),
    lifeExpectancy: plan.lifeExpectancy,
    financialAssets: plan.cash + plan.securities,
    realEstateValue: sellableValue(plan),
    relocationCost: plan.relocationCost,
    monthlyHousingAfterSale: plan.monthlyHousingAfterSale,
    monthlyPension: plan.pensionMonthly,
    monthlyOtherIncome: plan.otherIncomeMonthly,
    otherIncomeEndAge: plan.otherIncomeEndAge,
    monthlyLivingCost: plan.monthlyLivingCost,
    safetyMargin: plan.safetyMargin,
  };
}

export type PlanSummary = {
  age: number;
  netWorth: number; // 純資産（不動産の時価込み）
  diagnosis: QuickResult;
  taxNow: InheritanceResult; // いま相続が起きた場合
  undecidedCount: number; // 方針が「未定」の不動産
};

export function summarizePlan(plan: ClientPlan, year = new Date().getFullYear()): PlanSummary {
  const financial = plan.cash + plan.securities;
  const realEstate = totalRealEstateValue(plan);
  return {
    age: ageOf(plan, year),
    netWorth: financial + realEstate - plan.liabilities,
    diagnosis: runQuickDiagnosis(toQuickInput(plan, year)),
    taxNow: calculateInheritanceTax({
      estate: financial + realEstate,
      liabilities: plan.liabilities,
      deathBenefit: plan.deathBenefit,
      hasSpouse: plan.hasSpouse,
      childrenCount: plan.childrenCount,
    }),
    undecidedCount: plan.realEstates.filter((r) => r.policy === "undecided").length,
  };
}

/** 「次にやること」を、急ぐものから最大3件。 */
export function nextActions(plan: ClientPlan, summary: PlanSummary): string[] {
  const actions: string[] = [];
  const undecided = plan.realEstates.filter((r) => r.policy === "undecided");
  if (undecided.length > 0) actions.push(`${undecided.map((r) => r.label).join("・")}の方針（住み続ける／売る／貸す／子に渡す）を決める`);
  const { saleAge, extraAnnualSpend, depletionAge } = summary.diagnosis;
  if (saleAge !== null) {
    const years = saleAge - summary.age;
    actions.push(years <= 3 ? `不動産の売却準備を始める（${saleAge}歳までに売却）` : `${saleAge}歳までの売却を見据えて、いまの時価を確認しておく`);
  }
  if (extraAnnualSpend === 0 && depletionAge !== null) actions.push(`${depletionAge}歳ごろに資産が尽きる見込みのため、生活費・働き方・不動産の活用を見直す`);
  if (summary.taxNow.payableTax > 0) actions.push("相続税がかかる見込みのため、生前贈与や特例の使い方を税理士と確認する");
  if (actions.length === 0) actions.push("毎年あと使える額を目安に、やりたいことの予定を立てる");
  return actions.slice(0, 3);
}
