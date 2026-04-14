import { describe, it, expect } from "vitest";
import {
  ConsultantChatSchema,
  SupportTicketSchema,
  N8NTriggerSchema,
  LearningIssueCreateSchema,
  LearningSearchSchema,
  Admin2FAEnrollConfirmSchema,
  Admin2FADisableSchema,
} from "../validation";

describe("ConsultantChatSchema", () => {
  it("accepts minimal valid payload", () => {
    const r = ConsultantChatSchema.safeParse({ message: "Help me" });
    expect(r.success).toBe(true);
  });
  it("rejects empty message", () => {
    const r = ConsultantChatSchema.safeParse({ message: "" });
    expect(r.success).toBe(false);
  });
  it("rejects oversized message (>2000)", () => {
    const r = ConsultantChatSchema.safeParse({ message: "x".repeat(2001) });
    expect(r.success).toBe(false);
  });
  it("accepts optional context fields", () => {
    const r = ConsultantChatSchema.safeParse({
      message: "hi",
      session_id: "abc",
      page_url: "https://example.com/x",
      form_state: { foo: "bar" },
      recent_events: ["rage_click"],
    });
    expect(r.success).toBe(true);
  });
  it("rejects too many recent_events", () => {
    const r = ConsultantChatSchema.safeParse({
      message: "hi",
      recent_events: Array(21).fill("e"),
    });
    expect(r.success).toBe(false);
  });
});

describe("SupportTicketSchema", () => {
  it("accepts minimal ticket", () => {
    const r = SupportTicketSchema.safeParse({ message: "something broken" });
    expect(r.success).toBe(true);
  });
  it("rejects empty email", () => {
    const r = SupportTicketSchema.safeParse({ message: "x", email: "" });
    expect(r.success).toBe(false);
  });
  it("normalises email to lowercase + trims", () => {
    const r = SupportTicketSchema.safeParse({
      message: "help",
      email: "  USER@EXAMPLE.COM ",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("user@example.com");
  });
  it("requires https for screenshot_url", () => {
    const r = SupportTicketSchema.safeParse({
      message: "bug",
      screenshot_url: "http://example.com/s.png",
    });
    expect(r.success).toBe(false);
  });
});

describe("N8NTriggerSchema", () => {
  it("accepts valid slug", () => {
    const r = N8NTriggerSchema.safeParse({ template_slug: "social-cross-post" });
    expect(r.success).toBe(true);
  });
  it("rejects bad slug (with spaces)", () => {
    const r = N8NTriggerSchema.safeParse({ template_slug: "not a slug" });
    expect(r.success).toBe(false);
  });
  it("rejects leading hyphen", () => {
    const r = N8NTriggerSchema.safeParse({ template_slug: "-bad" });
    expect(r.success).toBe(false);
  });
  it("defaults inputs to empty object", () => {
    const r = N8NTriggerSchema.safeParse({ template_slug: "x-y" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.inputs).toEqual({});
  });
});

describe("LearningIssueCreateSchema", () => {
  it("rejects unknown category", () => {
    const r = LearningIssueCreateSchema.safeParse({
      category: "sparkles",
      symptom: "x",
      solution: "y",
    });
    expect(r.success).toBe(false);
  });
  it("accepts valid enum", () => {
    const r = LearningIssueCreateSchema.safeParse({
      category: "bug",
      symptom: "login fails",
      solution: "reset password",
    });
    expect(r.success).toBe(true);
  });
});

describe("LearningSearchSchema", () => {
  it("coerces limit from string", () => {
    const r = LearningSearchSchema.safeParse({ q: "instagram", limit: "10" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limit).toBe(10);
  });
  it("caps limit at 20", () => {
    const r = LearningSearchSchema.safeParse({ q: "x", limit: 100 });
    expect(r.success).toBe(false);
  });
});

describe("Admin2FAEnrollConfirmSchema", () => {
  it("accepts valid base32 secret + 6-digit code", () => {
    const r = Admin2FAEnrollConfirmSchema.safeParse({
      secret_b32: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
      code: "123456",
    });
    expect(r.success).toBe(true);
  });
  it("rejects lowercase secret", () => {
    const r = Admin2FAEnrollConfirmSchema.safeParse({
      secret_b32: "abcdefghij",
      code: "123456",
    });
    expect(r.success).toBe(false);
  });
  it("rejects 5-digit code", () => {
    const r = Admin2FAEnrollConfirmSchema.safeParse({
      secret_b32: "ABCDEFGHIJKLMNOP",
      code: "12345",
    });
    expect(r.success).toBe(false);
  });
});

describe("Admin2FADisableSchema", () => {
  it("accepts 6-digit TOTP", () => {
    const r = Admin2FADisableSchema.safeParse({ code: "654321" });
    expect(r.success).toBe(true);
  });
  it("accepts 10-char hex recovery code", () => {
    const r = Admin2FADisableSchema.safeParse({ code: "a1b2c3d4e5" });
    expect(r.success).toBe(true);
  });
  it("rejects alphabetic garbage", () => {
    const r = Admin2FADisableSchema.safeParse({ code: "zzzzzz" });
    expect(r.success).toBe(false);
  });
});
