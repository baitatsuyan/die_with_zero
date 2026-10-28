import { describe, expect, it } from "vitest";
import { newClientPlan } from "./clientPlan";
import { canChangeStatus, canReadClientData, candidateOffices, nextStatusesFor, scopeClientData, type Consent, type DirectoryOffice } from "./referrals";

const office = (id: string, type: DirectoryOffice["type"], city = "中央区"): DirectoryOffice => ({ id, name: id, type, area: { prefecture: "東京都", city }, specialties: [] });
const offices = [office("me", "tax_accountant"), office("re1", "real_estate"), office("re2", "real_estate"), office("re-minato", "real_estate", "港区"), office("js1", "judicial_scrivener"), office("tax2", "tax_accountant")];
const chuo = { prefecture: "東京都", city: "中央区" };

describe("candidateOffices", () => {
  it("目的に合う種別で、同じエリアの事務所を候補にし、自分は除く", () => {
    expect(candidateOffices(offices, [], "sale", chuo, "me").offices.map((o) => o.id)).toEqual(["re1", "re2"]);
    expect(candidateOffices(offices, [], "registration", chuo, "me").offices.map((o) => o.id)).toEqual(["js1"]);
    expect(candidateOffices(offices, [], "inheritance_tax", chuo, "me").offices.map((o) => o.id)).toEqual(["tax2"]);
  });

  it("不動産会社にエリア独占枠があれば、その1社だけにする", () => {
    const r = candidateOffices(offices, [{ prefecture: "東京都", city: "中央区", officeId: "re2" }], "sale", chuo, "me");
    expect(r.exclusive).toBe(true);
    expect(r.offices.map((o) => o.id)).toEqual(["re2"]);
  });

  it("独占枠は不動産会社だけに効き、ほかのエリアには効かない", () => {
    const slots = [{ prefecture: "東京都", city: "港区", officeId: "re-minato" }];
    expect(candidateOffices(offices, slots, "sale", chuo, "me").exclusive).toBe(false);
    expect(candidateOffices(offices, slots, "registration", chuo, "me").offices.map((o) => o.id)).toEqual(["js1"]);
  });
});

describe("canChangeStatus", () => {
  it("受けた側は、返事待ち→受諾/辞退、受諾後→対応中/受任/不成立だけ", () => {
    expect(canChangeStatus("to", "sent", "accepted")).toBe(true);
    expect(canChangeStatus("to", "awaiting_consent", "accepted")).toBe(false);
    expect(canChangeStatus("to", "accepted", "won")).toBe(true);
    expect(canChangeStatus("to", "won", "in_progress")).toBe(false);
    expect(nextStatusesFor("to", "in_progress")).toEqual(["won", "lost"]);
  });

  it("送った側は、受諾される前なら取り下げだけ", () => {
    expect(canChangeStatus("from", "sent", "withdrawn")).toBe(true);
    expect(canChangeStatus("from", "accepted", "withdrawn")).toBe(false);
    expect(canChangeStatus("from", "sent", "accepted")).toBe(false);
  });
});

describe("scopeClientData", () => {
  const plan = { ...newClientPlan("山田 花子", 1956), cash: 2500 };
  it("同意した範囲だけを渡す", () => {
    const d = scopeClientData(plan, ["basic", "real_estate"]);
    expect(d.name).toBe("山田 花子");
    expect(d.realEstates).toEqual([]);
    expect(d.cash).toBeUndefined();
    expect(d.plan).toBeUndefined();
  });

  it("対象の不動産が決まっていれば、その1件だけを渡す", () => {
    const withHomes = {
      ...plan,
      realEstates: [
        { id: "home", label: "自宅", propertyType: "condo" as const, prefecture: "東京都", city: "中央区", district: "", use: "home" as const, value: 6800, policy: "keep" as const },
        { id: "parents", label: "実家", propertyType: "house" as const, prefecture: "東京都", city: "中央区", district: "", use: "vacant" as const, value: 4200, policy: "undecided" as const },
      ],
    };
    expect(scopeClientData(withHomes, ["real_estate"], "parents").realEstates?.map((r) => r.id)).toEqual(["parents"]);
    expect(scopeClientData(withHomes, ["real_estate"], null).realEstates).toHaveLength(2);
  });

  it("受諾後で同意が有効な間だけ読める", () => {
    const consent: Consent = { id: "c", referralId: "r", clientId: "x", scopes: ["basic"], method: "in_meeting", grantedAt: "", revokedAt: null };
    expect(canReadClientData("accepted", consent)).toBe(true);
    expect(canReadClientData("sent", consent)).toBe(false);
    expect(canReadClientData("accepted", { ...consent, revokedAt: "2026-10-28" })).toBe(false);
  });
});
