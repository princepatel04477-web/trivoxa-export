import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getResend } from "@/lib/email/resend";
import { CONTACT } from "@/data/contact";

/** `topics` carries Insights topic votes (spec §4 — Insights teaser). They
 * ride to the team as an email note rather than a schema change, so the
 * subscribers table stays untouched. */
const schema = z.object({
  email: z.string().trim().email(),
  topics: z.array(z.string().trim().min(1).max(80)).max(5).optional(),
});

export async function handleNewsletter(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase
      .from("newsletter_subscribers")
      .upsert({ email: parsed.data.email }, { onConflict: "email" });
    if (error) {
      return NextResponse.json({ error: "Could not save your subscription" }, { status: 500 });
    }
  }

  const topics = parsed.data.topics ?? [];
  if (topics.length > 0) {
    const resend = getResend();
    if (resend) {
      try {
        await resend.emails.send({
          from: `Trivoxa Group <${CONTACT.noReply}>`,
          to: CONTACT.sales,
          subject: "Insights topic vote",
          html: `<p><strong>${parsed.data.email}</strong> wants to read about:</p><ul>${topics
            .map((t) => `<li>${t.replace(/</g, "&lt;")}</li>`)
            .join("")}</ul>`,
        });
      } catch (err) {
        // A lost vote email must not fail the subscription itself.
        console.error("Topic-vote notification failed", err);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
