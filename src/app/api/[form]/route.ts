import { NextResponse } from "next/server";
import { handleContact } from "@/lib/api/contact";
import { handleNewsletter } from "@/lib/api/newsletter";
import { handleRfq } from "@/lib/api/rfq";

/**
 * One route entry for all three form endpoints. The public URLs are unchanged
 * (/api/contact, /api/newsletter, /api/rfq) — only the entrypoint is shared.
 *
 * Turbopack chunks per route entry, so three separate route.ts files each got
 * their own full copy of the zod + supabase + resend vendor set: 141 KiB
 * gzipped, three times over, inside a Worker bound by a hard size limit.
 * Collapsing the entries leaves one copy. The handlers themselves are the
 * original bodies, moved verbatim to src/lib/api/.
 */
const HANDLERS: Record<string, (request: Request) => Promise<Response>> = {
  contact: handleContact,
  newsletter: handleNewsletter,
  rfq: handleRfq,
};

export async function POST(request: Request, { params }: { params: Promise<{ form: string }> }) {
  const { form } = await params;
  const handler = HANDLERS[form];
  if (!handler) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return handler(request);
}
