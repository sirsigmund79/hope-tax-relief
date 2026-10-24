import { describe, expect, it, vi } from "vitest";
import { extractWithModel, parseExtraction, RETRY_PROMPT, type Generate } from "@/lib/gemma";
import { fixtures, fixtureFor } from "@/lib/fixtures";

const good = JSON.stringify(fixtures.ssa);
const image = { base64: "AAAA", mimeType: "image/jpeg" };

describe("parseExtraction", () => {
  it("handles fenced JSON", () => {
    const r = parseExtraction("```json\n" + good + "\n```");
    expect(r.ok && r.data.annualIncome).toBe(14400);
  });

  it("handles prose-wrapped JSON", () => {
    const r = parseExtraction(`Sure! Here is the data:\n${good}\nLet me know if you need more.`);
    expect(r.ok && r.data.docType).toBe("SSA_1099");
  });

  it("rejects invalid JSON", () => {
    expect(parseExtraction("{docType: W2,").ok).toBe(false);
    expect(parseExtraction("I cannot read this image.").ok).toBe(false);
  });

  it("schema-invalid JSON fails but salvages valid fields", () => {
    const r = parseExtraction(JSON.stringify({ ...fixtures.w2, annualIncome: "$18,250", confidence: "very" }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.partial.personName).toBe("John Doe");
      expect(r.partial.annualIncome).toBeUndefined();
    }
  });
});

describe("extractWithModel", () => {
  it("succeeds on the first good reply", async () => {
    const gen = vi.fn<Generate>().mockResolvedValue(good);
    const r = await extractWithModel(gen, image);
    expect(r.ok).toBe(true);
    expect(gen).toHaveBeenCalledTimes(1);
  });

  it("invalid JSON → retries once with the follow-up prompt, then succeeds", async () => {
    const gen = vi.fn<Generate>().mockResolvedValueOnce("not json").mockResolvedValueOnce(good);
    const r = await extractWithModel(gen, image);
    expect(r.ok).toBe(true);
    expect(gen).toHaveBeenCalledTimes(2);
    const retryTurns = gen.mock.calls[1][0];
    expect(retryTurns).toHaveLength(3);
    expect(retryTurns[2].parts[0]).toEqual({ text: RETRY_PROMPT });
  });

  it("schema-invalid twice → ok:false with partial", async () => {
    const bad = JSON.stringify({ ...fixtures.w2, docType: "PASSPORT" });
    const gen = vi.fn<Generate>().mockResolvedValue(bad);
    const r = await extractWithModel(gen, image);
    expect(r.ok).toBe(false);
    expect(gen).toHaveBeenCalledTimes(2);
    if (!r.ok) expect(r.partial.annualIncome).toBe(18250);
  });

  it("times out → ok:false", async () => {
    const gen: Generate = () => new Promise(() => {});
    const r = await extractWithModel(gen, image, 20);
    expect(r).toMatchObject({ ok: false, reason: expect.stringMatching(/too long/) });
  });

  it("network error → ok:false, never throws", async () => {
    const gen: Generate = () => Promise.reject(new Error("ECONNRESET"));
    expect((await extractWithModel(gen, image)).ok).toBe(false);
  });

  it("masks SSNs that slip into the reply", async () => {
    const leaky = JSON.stringify({ ...fixtures.w2, personName: "John Doe 123-45-6789" });
    const r = await extractWithModel(() => Promise.resolve(leaky), image);
    expect(r.ok && r.data.personName).toBe("John Doe XXX-XX-XXXX");
  });
});

describe("fixtureFor", () => {
  it("picks fixtures by filename hint", () => {
    expect(fixtureFor("sample-ssa-1099.png").docType).toBe("SSA_1099");
    expect(fixtureFor("tax_bill.jpg").docType).toBe("TAX_BILL");
    expect(fixtureFor("w2-cropped.jpg").issues.length).toBeGreaterThan(0);
    expect(fixtureFor("IMG_0001.jpg").docType).toBe("W2");
  });
});
