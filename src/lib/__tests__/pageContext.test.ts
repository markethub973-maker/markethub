import { describe, expect, it } from "vitest";
import { getPageContext, pageContextBlock } from "../pageContext";

describe("getPageContext", () => {
  it("returns context for known pages", () => {
    const ctx = getPageContext("/calendar");
    expect(ctx).not.toBeNull();
    expect(ctx?.name).toBe("Content Calendar");
    expect(ctx?.actions).toBeDefined();
    expect(ctx?.actions?.length).toBeGreaterThan(0);
  });

  it("returns context for all major feature pages", () => {
    const pages = ["/instagram", "/linkedin", "/ai-hub", "/lead-finder", "/settings"];
    for (const p of pages) {
      expect(getPageContext(p), `missing context for ${p}`).not.toBeNull();
    }
  });

  it("matches admin prefix routes", () => {
    const ctx = getPageContext("/dashboard/admin/some-sub-page");
    expect(ctx).not.toBeNull();
    expect(ctx?.name).toBe("Admin section");
  });

  it("returns null for completely unknown paths", () => {
    expect(getPageContext("/random-unknown-path-123")).toBeNull();
  });

  it("is case-sensitive (matches exact pathname)", () => {
    // If you hit /INSTAGRAM (wrong case), it won't match /instagram
    expect(getPageContext("/INSTAGRAM")).toBeNull();
  });
});

describe("pageContextBlock", () => {
  it("returns empty string when pathname is null/undefined", () => {
    expect(pageContextBlock(null)).toBe("");
    expect(pageContextBlock(undefined)).toBe("");
    expect(pageContextBlock("")).toBe("");
  });

  it("prepends a ## Current page header for known pages", () => {
    const block = pageContextBlock("/calendar");
    expect(block).toContain("## Current page: /calendar");
    expect(block).toContain("Content Calendar");
    expect(block).toContain("Key actions available");
  });

  it("returns a generic block for unknown paths instead of empty", () => {
    const block = pageContextBlock("/some-unknown-path");
    expect(block).toContain("## Current page: /some-unknown-path");
    expect(block).toContain("don't have rich context");
  });

  it("includes key actions when present on the page", () => {
    const block = pageContextBlock("/settings");
    expect(block).toContain("Connect social accounts");
  });
});
