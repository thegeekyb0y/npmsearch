import { describe, expect, it } from "vitest";
import { parseSearchParams } from "../../app/lib/search-params";

describe("parseSearchParams", () => {
  it("applies defaults", () => {
    const result = parseSearchParams(new URLSearchParams("q=react"));

    expect(result).toEqual({
      ok: true,
      value: { q: "react", from: 0, size: 20 },
    });
  });

  it("coerces pagination strings", () => {
    const result = parseSearchParams(
      new URLSearchParams("q=react&from=40&size=50"),
    );

    expect(result).toEqual({
      ok: true,
      value: { q: "react", from: 40, size: 50 },
    });
  });

  it("trims the query", () => {
    const result = parseSearchParams(new URLSearchParams("q=%20%20react%20%20"));

    expect(result.ok && result.value.q).toBe("react");
  });

  it("rejects a missing or empty query", () => {
    expect(parseSearchParams(new URLSearchParams("")).ok).toBe(false);
    expect(parseSearchParams(new URLSearchParams("q=%20%20")).ok).toBe(false);
  });

  it("rejects an oversized query", () => {
    const result = parseSearchParams(
      new URLSearchParams(`q=${"a".repeat(201)}`),
    );

    expect(result.ok).toBe(false);
  });

  it("rejects invalid pagination", () => {
    expect(parseSearchParams(new URLSearchParams("q=react&from=-1")).ok).toBe(false);
    expect(parseSearchParams(new URLSearchParams("q=react&from=abc")).ok).toBe(false);
    expect(parseSearchParams(new URLSearchParams("q=react&size=0")).ok).toBe(false);
    expect(parseSearchParams(new URLSearchParams("q=react&size=1.5")).ok).toBe(false);
  });
});
