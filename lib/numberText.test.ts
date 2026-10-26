import { describe, expect, it } from "vitest";
import { sanitizeDigits } from "./numberText";

describe("sanitizeDigits", () => {
  it("0のあとに数字を入れたら、先頭の0を落とす", () => {
    expect(sanitizeDigits("05")).toBe("5");
    expect(sanitizeDigits("0050")).toBe("50");
  });

  it("0だけ・空欄はそのまま", () => {
    expect(sanitizeDigits("0")).toBe("0");
    expect(sanitizeDigits("")).toBe("");
  });

  it("全角数字やカンマを入れても数字として扱う", () => {
    expect(sanitizeDigits("５０００")).toBe("5000");
    expect(sanitizeDigits("1,500")).toBe("1500");
    expect(sanitizeDigits("12万")).toBe("12");
  });
});
