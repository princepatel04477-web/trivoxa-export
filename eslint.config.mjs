import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    // Generated Cloudflare Worker bundle — linting it OOMs the ESLint process.
    ".open-next/**",
    ".wrangler/**",
    "next-env.d.ts",
    "docs/**",
    ".claude/**",
  ]),
]);

export default eslintConfig;
