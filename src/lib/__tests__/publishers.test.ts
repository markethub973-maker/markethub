import { describe, expect, it } from "vitest";
import { buildPostText, isUsableImageUrl, type ScheduledPostRow } from "../publishers";

const basePost: ScheduledPostRow = {
  id: "1",
  user_id: "u1",
  title: "t",
  caption: null,
  platform: "linkedin",
  status: "scheduled",
  date: "2026-04-11",
  time: "12:00",
  image_url: null,
  client: null,
  hashtags: null,
  first_comment: null,
};

describe("buildPostText", () => {
  it("returns empty string when caption and hashtags are null", () => {
    expect(buildPostText(basePost)).toBe("");
  });

  it("returns just caption when no hashtags", () => {
    expect(buildPostText({ ...basePost, caption: "hello world" })).toBe("hello world");
  });

  it("prepends # to comma-separated hashtags without one", () => {
    const result = buildPostText({ ...basePost, caption: "hey", hashtags: "marketing,socialmedia" });
    expect(result).toContain("#marketing");
    expect(result).toContain("#socialmedia");
  });

  it("leaves already-hashed tags alone", () => {
    const result = buildPostText({ ...basePost, caption: "hey", hashtags: "#marketing #social" });
    expect(result).toBe("hey\n\n#marketing #social");
  });

  it("separates caption and hashtags with blank line", () => {
    const result = buildPostText({ ...basePost, caption: "post", hashtags: "#tag" });
    expect(result).toBe("post\n\n#tag");
  });
});

describe("isUsableImageUrl", () => {
  it("rejects null and empty", () => {
    expect(isUsableImageUrl(null)).toBe(false);
    expect(isUsableImageUrl("")).toBe(false);
    expect(isUsableImageUrl(undefined)).toBe(false);
  });

  it("rejects plain website URLs", () => {
    expect(isUsableImageUrl("https://markethubpromo.com/")).toBe(false);
    expect(isUsableImageUrl("https://example.com")).toBe(false);
  });

  it("accepts common image extensions", () => {
    expect(isUsableImageUrl("https://example.com/photo.jpg")).toBe(true);
    expect(isUsableImageUrl("https://example.com/photo.jpeg")).toBe(true);
    expect(isUsableImageUrl("https://example.com/photo.png")).toBe(true);
    expect(isUsableImageUrl("https://example.com/photo.webp")).toBe(true);
    expect(isUsableImageUrl("https://example.com/photo.gif")).toBe(true);
    expect(isUsableImageUrl("https://example.com/photo.avif")).toBe(true);
  });

  it("accepts image extensions with query strings", () => {
    expect(isUsableImageUrl("https://cdn.example.com/photo.jpg?w=800")).toBe(true);
  });

  it("accepts known image hosts even without extension", () => {
    expect(isUsableImageUrl("https://res.cloudinary.com/demo/image/upload/sample")).toBe(true);
    expect(isUsableImageUrl("https://i.imgur.com/abc123")).toBe(true);
    expect(isUsableImageUrl("https://kashohhwsxyhyhhppvik.supabase.co/storage/v1/public/...")).toBe(true);
  });

  it("accepts http:// as well as https:// (protocol-agnostic)", () => {
    expect(isUsableImageUrl("http://example.com/photo.jpg")).toBe(true);
  });

  it("rejects non-URL strings", () => {
    expect(isUsableImageUrl("not a url")).toBe(false);
    expect(isUsableImageUrl("javascript:alert(1)")).toBe(false);
  });
});
