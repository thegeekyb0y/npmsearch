import type { MetadataRoute } from "next";

const DISALLOWED_CRAWLERS = [
  "SemrushBot",
  "AhrefsBot",
  "MJ12bot",
  "DotBot",
  "BLEXBot",
  "PetalBot",
  "DataForSeoBot",
];

/**
 * Real rules so crawlers never reach the package catch-all. Googlebot and
 * Bingbot are intentionally allowed; actual blocking is enforced in the Vercel
 * Firewall.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...DISALLOWED_CRAWLERS.map((userAgent) => ({
        userAgent,
        disallow: "/",
      })),
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/search", "/api/"],
        crawlDelay: 10,
      },
    ],
  };
}
