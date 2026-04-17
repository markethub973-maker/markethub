/**
 * Browserbase — headless browser screenshot & extraction fallback.
 *
 * Used as fallback when Apify quota is exceeded or unavailable.
 * Creates a cloud browser session via Browserbase, navigates to URL,
 * captures a viewport screenshot (1440x900 = 16:9 safe for video),
 * and extracts page title + meta description.
 *
 * Architecture: Browserbase hosts the browser — we connect via CDP
 * (Chrome DevTools Protocol) using playwright-core (thin client, no
 * bundled browser binary). Ideal for serverless / Vercel functions.
 *
 * Pricing (2026-04-16):
 *   Free tier: 1 browser-hour/month (~30 screenshots at 2min each)
 *   Developer: $20/mo, 100 hours ($0.12/hr overage)
 *   Typical screenshot: ~15-30s = ~$0.001-0.004 on paid plan
 *
 * Env: BROWSERBASE_API_KEY  (from https://browserbase.com/settings)
 *      BROWSERBASE_PROJECT_ID (optional — uses default project if omitted)
 *
 * Usage:
 *   import { screenshotViaLab } from "@/lib/browserbase";
 *   const result = await screenshotViaLab("https://example.com");
 *   if (result) { result.screenshot_url, result.title, result.description }
 */

import { createServiceClient } from "@/lib/supabase/service";

export interface BrowserbaseResult {
  screenshot_url: string;
  title?: string;
  description?: string;
}

/**
 * Take a viewport screenshot of a URL and extract basic metadata.
 *
 * Returns a public URL to the screenshot (uploaded to Supabase Storage)
 * plus the page title and meta description when available.
 *
 * Returns null if BROWSERBASE_API_KEY is missing, or on any failure.
 */
export async function screenshotViaLab(
  url: string,
): Promise<BrowserbaseResult | null> {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  if (!apiKey) return null;
  if (!url) return null;

  // Lazy-import heavy deps so they're only loaded when actually called
  const [{ default: Browserbase }, { chromium }] = await Promise.all([
    import("@browserbasehq/sdk"),
    import("playwright-core"),
  ]);

  let browser: Awaited<ReturnType<typeof chromium.connectOverCDP>> | null = null;

  try {
    // Step 1: Create a cloud browser session
    const bb = new Browserbase({ apiKey });
    const session = await bb.sessions.create({
      projectId: process.env.BROWSERBASE_PROJECT_ID || undefined,
      browserSettings: {
        viewport: { width: 1440, height: 900 },
      },
    });

    // Step 2: Connect via CDP and navigate
    browser = await chromium.connectOverCDP(session.connectUrl, {
      timeout: 30_000,
    });
    const context = browser.contexts()[0];
    const page = context.pages()[0];

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    // Brief wait for above-the-fold content to render
    await page.waitForTimeout(2_000);

    // Step 3: Extract metadata
    const title = await page.title().catch(() => undefined);
    const description = await page
      .locator('meta[name="description"]')
      .getAttribute("content")
      .catch(() => undefined);

    // Step 4: Take viewport screenshot (not full page — safe aspect ratio)
    const screenshotBuffer = await page.screenshot({
      fullPage: false,
      type: "png",
    });

    await page.close();
    await browser.close();
    browser = null;

    // Step 5: Upload to Supabase public-assets
    const svc = createServiceClient();
    const domain = url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    const fileName = `screenshots/bb-${domain}-${Date.now()}.png`;

    const { data: upload, error: uploadErr } = await svc.storage
      .from("public-assets")
      .upload(fileName, screenshotBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadErr || !upload) return null;

    const { data: urlData } = svc.storage
      .from("public-assets")
      .getPublicUrl(fileName);

    return {
      screenshot_url: urlData.publicUrl,
      title: title || undefined,
      description: description || undefined,
    };
  } catch {
    return null;
  } finally {
    // Ensure browser is always closed to avoid leaked sessions
    if (browser) {
      try {
        await browser.close();
      } catch {
        /* already closed */
      }
    }
  }
}
