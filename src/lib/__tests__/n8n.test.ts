/**
 * Unit tests for src/lib/n8n.ts — focus on verifyN8NCallbackSignature.
 * Pure HMAC logic, no mocking needed. Sets the secret env var before
 * each test and tears down after.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createHmac } from "node:crypto";

const TEST_SECRET = "test-secret-only-used-in-this-file-1234567890abcdef";
const ORIGINAL = process.env.N8N_WEBHOOK_SECRET;

let verifyN8NCallbackSignature: typeof import("../n8n").verifyN8NCallbackSignature;

beforeAll(async () => {
  process.env.N8N_WEBHOOK_SECRET = TEST_SECRET;
  // Lazy import so the module reads the env var
  const mod = await import("../n8n");
  verifyN8NCallbackSignature = mod.verifyN8NCallbackSignature;
});

afterAll(() => {
  if (ORIGINAL === undefined) delete process.env.N8N_WEBHOOK_SECRET;
  else process.env.N8N_WEBHOOK_SECRET = ORIGINAL;
});

function sign(body: string, secret: string = TEST_SECRET): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

describe("verifyN8NCallbackSignature", () => {
  it("accepts a valid signature on a JSON payload", () => {
    const body = JSON.stringify({ run_id: "abc", status: "succeeded" });
    expect(verifyN8NCallbackSignature(body, sign(body))).toBe(true);
  });

  it("rejects when the body has been tampered with", () => {
    const body = JSON.stringify({ run_id: "abc", status: "succeeded" });
    const sig = sign(body);
    const tampered = JSON.stringify({ run_id: "abc", status: "failed" });
    expect(verifyN8NCallbackSignature(tampered, sig)).toBe(false);
  });

  it("rejects when the signature was made with the wrong secret", () => {
    const body = JSON.stringify({ run_id: "abc" });
    const wrongSig = sign(body, "different-secret");
    expect(verifyN8NCallbackSignature(body, wrongSig)).toBe(false);
  });

  it("accepts signature without the sha256= prefix", () => {
    const body = JSON.stringify({ run_id: "abc" });
    const sigBare = createHmac("sha256", TEST_SECRET).update(body).digest("hex");
    expect(verifyN8NCallbackSignature(body, sigBare)).toBe(true);
  });

  it("rejects an obviously bogus signature", () => {
    const body = JSON.stringify({ run_id: "abc" });
    expect(verifyN8NCallbackSignature(body, "sha256=deadbeef")).toBe(false);
  });

  it("rejects empty signature", () => {
    const body = JSON.stringify({ run_id: "abc" });
    expect(verifyN8NCallbackSignature(body, "")).toBe(false);
  });

  it("works on empty body when signed correctly", () => {
    expect(verifyN8NCallbackSignature("", sign(""))).toBe(true);
  });

  it("uses constant-time compare (sanity: same-length wrong hex returns false)", () => {
    const body = JSON.stringify({ run_id: "abc" });
    const realSig = createHmac("sha256", TEST_SECRET).update(body).digest("hex");
    // Same length, all zeros — would short-circuit a naive ===
    const fakeSig = "0".repeat(realSig.length);
    expect(verifyN8NCallbackSignature(body, "sha256=" + fakeSig)).toBe(false);
  });
});
