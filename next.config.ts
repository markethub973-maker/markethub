import type { NextConfig } from "next";

// Security headers applied to all routes (OWASP A05 — Security Misconfiguration)
const securityHeaders = [
  // Prevent clickjacking
  { key: "X-Frame-Options", value: "DENY" },
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Block reflected XSS in older browsers
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // Force HTTPS for 1 year, include subdomains
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // Limit referrer info sent to third parties
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restrict browser features
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Content-Security-Policy — NOTE: a full CSP with nonces is the ideal end-state;
  // this baseline blocks the most common XSS vectors without breaking the app.
  // Extend as needed once a nonce strategy is implemented.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Scripts: allow self + inline (required by Next.js) + trusted CDNs
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      // Styles
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fonts
      "font-src 'self' https://fonts.gstatic.com data:",
      // Images: allow self, data URIs, and key CDNs used in the app
      "img-src 'self' data: blob: https://*.cdninstagram.com https://*.fbcdn.net https://picsum.photos https://api.dicebear.com https://*.googleapis.com",
      // API/fetch connections
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://api.stripe.com https://graph.facebook.com https://api.apify.com https://api.resend.com",
      // Frames: only Stripe
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      // No plugins
      "object-src 'none'",
      // Upgrade mixed content
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["stripe"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "api.dicebear.com" },
    ],
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;