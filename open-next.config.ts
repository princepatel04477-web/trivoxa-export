import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// No `buildOutputPath` / `appPath` overrides: the deploy step resolves the
// compiled config relative to process.cwd(), and overriding either is a known
// cause of "Could not find compiled Open Next config".
const config = defineCloudflareConfig({
  // Deliberately not the bare `defineCloudflareConfig()` default, which resolves
  // incrementalCache to "dummy". A dummy cache makes the Worker re-render every
  // one of the 476 prerendered routes on each request instead of serving the
  // build output. Every route here is prerendered and nothing calls revalidate*,
  // so the static-assets cache serves them straight from the assets bucket.
  incrementalCache: staticAssetsIncrementalCache,
});

export default {
  ...config,
  // Escapes the recursion trap. The adapter shells out to `npm run build` by
  // default, so pointing `build` at the adapter would loop forever. Naming the
  // Next build directly means `npm run build` can BE the adapter build, which
  // is what Cloudflare Workers Builds runs out of the box — without it, CI
  // produces .next/ only and the deploy step fails with
  // "Could not find compiled Open Next config".
  buildCommand: "npx next build",
};
