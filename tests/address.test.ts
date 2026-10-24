import { describe, expect, it } from "vitest";
import { parseAddress } from "@/lib/address";

describe("parseAddress", () => {
  it("splits a full comma-separated address", () => {
    expect(parseAddress("1234 Example St, Detroit, MI 48200")).toEqual({ street: "1234 Example St", city: "Detroit", state: "MI", zip: "48200" });
  });
  it("handles no commas", () => {
    expect(parseAddress("1415 Parker St Detroit MI 48214")).toEqual({ street: "1415 Parker St", city: "Detroit", state: "MI", zip: "48214" });
  });
  it("defaults city and state when only a street is given", () => {
    expect(parseAddress("1415 Parker St")).toEqual({ street: "1415 Parker St", city: "Detroit", state: "MI", zip: "" });
  });
  it("doesn't mistake a 5-digit house number for a ZIP", () => {
    expect(parseAddress("12000 Grand River Ave, Detroit")).toMatchObject({ street: "12000 Grand River Ave", zip: "" });
  });
  it("keeps another city when given", () => {
    expect(parseAddress("5 Main St, Hamtramck, Michigan 48212")).toEqual({ street: "5 Main St", city: "Hamtramck", state: "MI", zip: "48212" });
  });
});
