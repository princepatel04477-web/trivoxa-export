import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

export default defineCloudflareConfig({
  // The site is fully prerendered and never revalidates on demand, so the
  // build-time output served from the Workers assets bucket is the cache.
  incrementalCache: staticAssetsIncrementalCache,
});
