import { describe, expect, it } from "vitest";
import { num, usd } from "@/lib/format";

describe("num", () => {
  it("parses typed money", () => {
    expect(num("$2,100")).toBe(2100);
    expect(num(" 14400.50 ")).toBe(14400.5);
  });
  it("returns null for blank or junk", () => {
    expect(num("")).toBeNull();
    expect(num("abc")).toBeNull();
    expect(num("-5")).toBeNull();
  });
  it("formats dollars", () => {
    expect(usd(2100)).toBe("$2,100");
    expect(usd(null)).toBe("—");
  });
});
