import { describe, expect, it } from "vitest";
import { maskDeep, maskSsn } from "@/lib/mask";

describe("maskSsn", () => {
  it("masks dashed and undashed SSNs", () => {
    expect(maskSsn("SSN 123-45-6789 ok")).toBe("SSN XXX-XX-XXXX ok");
    expect(maskSsn("123456789")).toBe("XXX-XX-XXXX");
  });
  it("leaves money and short numbers alone", () => {
    expect(maskSsn("Box 1: 14400.00, year 2025")).toBe("Box 1: 14400.00, year 2025");
  });
  it("masks nested values", () => {
    expect(maskDeep({ a: ["id 123-45-6789"], n: 5 })).toEqual({ a: ["id XXX-XX-XXXX"], n: 5 });
  });
});
