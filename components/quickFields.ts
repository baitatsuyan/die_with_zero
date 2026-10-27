// かんたん診断の質問。LPの埋め込み版と /quick の質問形式で共有する。

import type { QuickInput } from "@/lib/simulation";

export type QuickFieldKey =
  | "currentAge"
  | "financialAssets"
  | "realEstateValue"
  | "relocationCost"
  | "monthlyHousingAfterSale"
  | "monthlyPension"
  | "monthlyOtherIncome"
  | "otherIncomeEndAge"
  | "monthlyLivingCost"
  | "safetyMargin";

export type QuickField = {
  key: QuickFieldKey;
  label: string;
  question: string; // 質問形式で表示する文
  hint: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  presets: number[]; // 質問形式でワンタップで選べる候補
  showIf?: (input: QuickInput) => boolean; // 条件に合うときだけ質問する
  helpLink?: { href: string; label: string }; // 質問形式で答え方の助けになるページ
};

/** いまの回答で表示する質問だけを返す。 */
export const visibleQuickFields = (input: QuickInput) => QUICK_FIELDS.filter((f) => !f.showIf || f.showIf(input));

export const QUICK_FIELDS: QuickField[] = [
  {
    key: "currentAge",
    label: "いまの年齢",
    question: "いま、何歳ですか？",
    hint: "",
    unit: "歳",
    min: 40,
    max: 85,
    step: 1,
    presets: [50, 55, 60, 65, 70],
  },
  {
    key: "financialAssets",
    label: "預貯金・証券の合計",
    question: "預貯金と証券は、合わせてどれくらいありますか？",
    hint: "ざっくりで大丈夫です",
    unit: "万円",
    min: 0,
    max: 100000,
    step: 100,
    presets: [1000, 2000, 3000, 5000, 10000],
  },
  {
    key: "realEstateValue",
    label: "不動産の合計",
    question: "自宅や実家などの不動産は、合わせていくらくらいですか？",
    hint: "売ったらいくらになりそうかの目安。預貯金・証券が足りなくなる前に売る前提で、売却の期限をお伝えします",
    unit: "万円",
    min: 0,
    max: 100000,
    step: 100,
    presets: [0, 1000, 2000, 3000, 5000],
    helpLink: { href: "/properties", label: "いくらか分からない場合は、取引事例から推定できます" },
  },
  {
    key: "relocationCost",
    label: "住み替えの一時費用",
    question: "売ったあとに住み替えるとき、最初にかかる費用はどれくらいですか？",
    hint: "引越し・賃貸の初期費用なら100〜200万円、住まいを買うなら購入費、高齢者住宅なら入居一時金が目安です",
    unit: "万円",
    min: 0,
    max: 100000,
    step: 10,
    presets: [100, 200, 500, 1000, 2000],
    showIf: (input) => input.realEstateValue > 0,
  },
  {
    key: "monthlyHousingAfterSale",
    label: "売却後の住居費（月額）",
    question: "住み替えたあと、毎月の住居費はどれくらいかかりそうですか？",
    hint: "家賃や管理費など。いまの生活費に上乗せして計算します。買い替えでローンがなければ管理費程度で大丈夫です",
    unit: "万円",
    min: 0,
    max: 100,
    step: 1,
    presets: [0, 3, 5, 8, 12],
    showIf: (input) => input.realEstateValue > 0,
  },
  {
    key: "monthlyPension",
    label: "年金の見込み（月額）",
    question: "年金は、月にいくらくらい受け取れそうですか？",
    hint: "ご夫婦の合計。65歳から受給として計算",
    unit: "万円",
    min: 0,
    max: 100,
    step: 1,
    presets: [15, 20, 22, 25, 30],
  },
  {
    key: "monthlyOtherIncome",
    label: "年金以外の収入（月額）",
    question: "年金以外の収入は、月にいくらくらいありますか？",
    hint: "働いて得る収入や家賃収入など。なければ0のままで大丈夫です",
    unit: "万円",
    min: 0,
    max: 1000,
    step: 1,
    presets: [0, 5, 10, 20, 30],
  },
  {
    key: "otherIncomeEndAge",
    label: "年金以外の収入は何歳まで",
    question: "その収入は、何歳まで続きそうですか？",
    hint: "家賃収入などずっと続く場合は90歳に",
    unit: "歳",
    min: 40,
    max: 100,
    step: 1,
    presets: [65, 70, 75, 80, 90],
    showIf: (input) => input.monthlyOtherIncome > 0,
  },
  {
    key: "monthlyLivingCost",
    label: "毎月の生活費",
    question: "毎月の生活費は、どれくらいですか？",
    hint: "いまの住まいの住居費を含めた平均",
    unit: "万円",
    min: 5,
    max: 100,
    step: 1,
    presets: [20, 25, 26, 30, 35],
  },
  {
    key: "safetyMargin",
    label: "最期に残しておきたい額",
    question: "最期に、いくらは残しておきたいですか？",
    hint: "医療・介護の予備費など",
    unit: "万円",
    min: 0,
    max: 10000,
    step: 100,
    presets: [0, 300, 500, 1000, 2000],
  },
];
