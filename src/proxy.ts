import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Run on every path except API routes, Next internals and anything with a
  // file extension (static assets: images, fonts, favicon, sitemap...).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
