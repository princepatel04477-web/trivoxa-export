import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// No `buildOutputPath` / `appPath` overrides: the deploy step resolves the
// compiled config relative to process.cwd(), and overriding either is a known
// cause of "Could not find compiled Open Next config".
export default defineCloudflareConfig({
  // Deliberately not the bare `defineCloudflareConfig()` default, which resolves
  // incrementalCache to "dummy". A dummy cache makes the Worker re-render every
  // one of the 476 prerendered routes on each request instead of serving the
  // build output. Every route here is prerendered and nothing calls revalidate*,
  // so the static-assets cache serves them straight from the assets bucket.
  incrementalCache: staticAssetsIncrementalCache,
});
