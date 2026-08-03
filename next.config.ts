import type { NextConfig } from "next";
import path from "node:path";

/**
 * Security headers for a public deployment.
 *
 * The app renders only its own analysis output — no third-party scripts, no
 * embeds, no user-supplied HTML — so the policy can stay tight. `unsafe-inline`
 * is required for styles (Next inlines critical CSS) and for the framework's
 * bootstrap script payload; everything else is same-origin only.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" +
    (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'" +
    (process.env.NODE_ENV === "development" ? " ws: wss:" : ""),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // Full server image (Docker uses node_modules + `pnpm start`), not standalone.
  turbopack: {
    root: path.join(__dirname),
  },
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The platform terminates TLS; only advertise HSTS in production.
      ...(process.env.NODE_ENV === "production"
        ? [
            {
              source: "/:path*",
              headers: [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains",
                },
              ],
            },
          ]
        : []),
    ];
  },
};

export default nextConfig;
