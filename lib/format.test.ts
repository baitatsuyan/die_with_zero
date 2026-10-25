import { describe, expect, it } from "vitest";
import { formatAxisMan, formatMan } from "./format";

describe("formatMan", () => {
  it("1億未満は万円で、1億以上は億と万で表示する", () => {
    expect(formatMan(2350)).toBe("2,350万円");
    expect(formatMan(10000)).toBe("1億円");
    expect(formatMan(176052.4)).toBe("17億6,052万円");
    expect(formatMan(-500)).toBe("-500万円");
  });
});

describe("formatAxisMan", () => {
  it("1億以上は億で短く表示する", () => {
    expect(formatAxisMan(4000)).toBe("4,000");
    expect(formatAxisMan(100000)).toBe("10億");
  });
});
