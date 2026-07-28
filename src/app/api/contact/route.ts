import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getResend } from "@/lib/email/resend";
import { contactSchema } from "@/lib/validation/contact";

const SALES_EMAIL = "sales@trivoxagroup.com";

/** Buyer-supplied text goes into an HTML email body, so it is escaped at the
 * boundary — the same treatment the newsletter route already gives topic votes. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;
  const reference = `TVX-MSG-${randomUUID().split("-")[0].toUpperCase()}`;

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from("contact_submissions").insert({
      reference,
      full_name: data.fullName,
      company_name: data.companyName || null,
      email: data.email,
      message: data.message,
    });
    if (error) {
      return NextResponse.json({ error: "Could not save your message" }, { status: 500 });
    }
  }

  const resend = getResend();
  if (resend) {
    // The message is already persisted above, so a mail-transport failure must
    // not turn a received message into a 500 the buyer reads as "lost". Matches
    // how the RFQ and newsletter routes already handle Resend.
    try {
      await resend.emails.send({
        from: "Trivoxa Group <no-reply@trivoxagroup.com>",
        to: SALES_EMAIL,
        subject: `New contact form message — ${reference}`,
        html: `<p><strong>${escapeHtml(data.fullName)}</strong> (${escapeHtml(data.email)})${
          data.companyName ? ` — ${escapeHtml(data.companyName)}` : ""
        }</p><p>${escapeHtml(data.message)}</p>`,
      });
    } catch (err) {
      console.error("Resend email failed for contact message", reference, err);
    }
  } else {
    console.warn(`RESEND_API_KEY not configured — contact message ${reference} was not emailed.`);
  }

  return NextResponse.json({ reference });
}
