#!/usr/bin/env node
/**
 * Locale-routing conformance probe.
 *
 * Captures the EXACT redirect/rewrite behaviour of the locale middleware as a
 * table, so a replacement implementation can be diffed against the original
 * rather than eyeballed. Run it against the reference server, save the output,
 * swap the implementation, run it again, and compare.
 *
 *   node scripts/probe-locale-routing.mjs http://127.0.0.1:3101 > baseline.txt
 *   node scripts/probe-locale-routing.mjs http://127.0.0.1:8787 > candidate.txt
 *   diff baseline.txt candidate.txt
 *
 * Redirects are NOT followed: the status and Location are the contract.
 */

const BASE = process.argv[2] ?? "http://127.0.0.1:3101";

const PATHS = [
  "/",
  "/group",
  "/group/",
  "/industries",
  "/global-presence",
  "/industries/textile-apparel",
  "/businesses/product-exports/textile-apparel",
  "/en",
  "/en/",
  "/en/group",
  "/en/industries/textile-apparel",
  "/de",
  "/de/group",
  "/de/industries/textile-apparel",
  "/fr/insights",
  "/ar/careers",
  "/hi",
  "/zz",
  "/zz/group",
  "/nonexistent-page",
  "/de/nonexistent-page",
  "/favicon.ico",
  "/images/trivoxa-eagle.png",
  "/sitemap.xml",
  "/robots.txt",
];

/** Header sets, to exercise cookie and Accept-Language detection. */
const HEADER_SETS = [
  ["bare", {}],
  ["al=de", { "Accept-Language": "de-DE,de;q=0.9,en;q=0.8" }],
  ["al=fr", { "Accept-Language": "fr-FR,fr;q=0.9" }],
  ["cookie=de", { Cookie: "NEXT_LOCALE=de" }],
  ["cookie=de,al=fr", { Cookie: "NEXT_LOCALE=de", "Accept-Language": "fr-FR,fr;q=0.9" }],
  ["cookie=zz", { Cookie: "NEXT_LOCALE=zz" }],
];

const rows = [];

for (const [label, headers] of HEADER_SETS) {
  for (const path of PATHS) {
    let status = "ERR";
    let location = "";
    let setCookie = "";
    try {
      const res = await fetch(`${BASE}${path}`, { headers, redirect: "manual" });
      status = res.status;
      location = res.headers.get("location") ?? "";
      // Only the locale cookie matters; ignore Next's own bookkeeping.
      const sc = res.headers.getSetCookie?.() ?? [];
      setCookie = sc.filter((c) => c.startsWith("NEXT_LOCALE")).map((c) => c.split(";")[0]).join(",");
    } catch (err) {
      location = String(err.message ?? err).slice(0, 40);
    }
    rows.push(
      [label.padEnd(16), String(status).padEnd(4), path.padEnd(46), location.padEnd(34), setCookie].join(" ")
    );
  }
}

console.log(rows.join("\n"));
