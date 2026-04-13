/**
 * Unit tests for src/lib/learningDB.ts — focus on extractSearchTerms.
 * Pure logic, no DB mock needed.
 */

import { describe, it, expect } from "vitest";
import { extractSearchTerms } from "../learningDB";

describe("extractSearchTerms", () => {
  it("returns empty array on empty input", () => {
    expect(extractSearchTerms("")).toEqual([]);
    expect(extractSearchTerms("   ")).toEqual([]);
  });

  it("returns empty array on too-short input (<3 chars)", () => {
    expect(extractSearchTerms("a")).toEqual([]);
    expect(extractSearchTerms("ab")).toEqual([]);
  });

  it("lowercases everything", () => {
    expect(extractSearchTerms("INSTAGRAM Token")).toEqual(["instagram", "token"]);
  });

  it("strips punctuation and splits on whitespace", () => {
    expect(extractSearchTerms("instagram, token-expired? help!")).toEqual([
      "instagram", "token", "expired", "help",
    ]);
  });

  it("filters out words shorter than 3 chars", () => {
    expect(extractSearchTerms("a is the token of an instagram")).toEqual([
      "the", "token", "instagram",
    ]);
  });

  it("caps at 8 terms even with longer queries", () => {
    const long = "one two three four five six seven eight nine ten eleven";
    expect(extractSearchTerms(long)).toHaveLength(8);
    expect(extractSearchTerms(long)).toEqual([
      "one", "two", "three", "four", "five", "six", "seven", "eight",
    ]);
  });

  it("handles unicode by stripping non-alphanum chars (best-effort)", () => {
    // Romanian diacritic 'ț' is stripped → "con ine caractere speciale" then
    // split. Documents that the regex is ASCII-only so any caller wanting
    // non-Latin search must normalise input upstream.
    expect(extractSearchTerms("conține caractere speciale")).toEqual([
      "con", "ine", "caractere", "speciale",
    ]);
  });

  it("handles numeric tokens", () => {
    expect(extractSearchTerms("error 401 from instagram api v17")).toEqual([
      "error", "401", "from", "instagram", "api", "v17",
    ]);
  });

  it("collapses multiple whitespace", () => {
    expect(extractSearchTerms("token    expired   help")).toEqual([
      "token", "expired", "help",
    ]);
  });

  it("trims leading/trailing whitespace", () => {
    expect(extractSearchTerms("   instagram token   ")).toEqual([
      "instagram", "token",
    ]);
  });
});
