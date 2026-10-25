import { describe, expect, it } from "vitest";
import { calculateInheritanceTax, legalShares, taxForShare } from "./inheritanceTax";

const base = { liabilities: 0, deathBenefit: 0 };

describe("taxForShare", () => {
  it("速算表どおりに計算する", () => {
    expect(taxForShare(0)).toBe(0);
    expect(taxForShare(1000)).toBe(100);
    expect(taxForShare(2600)).toBeCloseTo(340);
    expect(taxForShare(15000)).toBeCloseTo(4300);
    expect(taxForShare(70000)).toBeCloseTo(31300);
  });
});

describe("legalShares", () => {
  it("配偶者と子2人なら配偶者1/2、子1/4ずつ", () => {
    expect(legalShares(true, 2)).toEqual({ spouse: 0.5, child: 0.25 });
  });
  it("子のみなら均等、配偶者のみなら全部", () => {
    expect(legalShares(false, 4)).toEqual({ spouse: 0, child: 0.25 });
    expect(legalShares(true, 0)).toEqual({ spouse: 1, child: 0 });
  });
});

describe("calculateInheritanceTax", () => {
  it("基礎控除以下なら相続税はかからない", () => {
    const r = calculateInheritanceTax({ ...base, estate: 4800, hasSpouse: true, childrenCount: 2 });
    expect(r.basicDeduction).toBe(4800);
    expect(r.taxableEstate).toBe(0);
    expect(r.payableTax).toBe(0);
  });

  it("1億円・子2人なら770万円", () => {
    const r = calculateInheritanceTax({ ...base, estate: 10000, hasSpouse: false, childrenCount: 2 });
    expect(r.totalTax).toBeCloseTo(770);
    expect(r.payableTax).toBeCloseTo(770);
  });

  it("1億円・配偶者と子2人なら総額630万円、配偶者の税額軽減後315万円", () => {
    const r = calculateInheritanceTax({ ...base, estate: 10000, hasSpouse: true, childrenCount: 2 });
    expect(r.totalTax).toBeCloseTo(630);
    expect(r.spouseReduction).toBeCloseTo(315);
    expect(r.payableTax).toBeCloseTo(315);
  });

  it("配偶者がすべて取得すれば1億6,000万円まで税額は0", () => {
    const r = calculateInheritanceTax({ ...base, estate: 16000, hasSpouse: true, childrenCount: 1, spouseAcquisition: 16000 });
    expect(r.totalTax).toBeGreaterThan(0);
    expect(r.payableTax).toBeCloseTo(0);
  });

  it("負債と死亡保険金の非課税枠を差し引く", () => {
    const r = calculateInheritanceTax({ estate: 5500, liabilities: 500, deathBenefit: 2000, hasSpouse: false, childrenCount: 2 });
    expect(r.insuranceExemption).toBe(1000);
    expect(r.taxablePrice).toBe(6000);
    expect(r.taxableEstate).toBe(1800);
    expect(r.payableTax).toBeCloseTo(180);
  });

  it("死亡保険金が非課税枠より少なければ全額が非課税", () => {
    const r = calculateInheritanceTax({ estate: 3000, liabilities: 0, deathBenefit: 300, hasSpouse: true, childrenCount: 1 });
    expect(r.insuranceExemption).toBe(300);
    expect(r.taxablePrice).toBe(3000);
  });
});
