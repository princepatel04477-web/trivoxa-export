import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getIndustryBySlug } from "@/lib/data/industries";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getResend } from "@/lib/email/resend";
import { autoReplyHtml, salesNotificationHtml } from "@/lib/email/rfq-templates";
import { rfqSchema } from "@/lib/validation/rfq";
import { CONTACT } from "@/data/contact";

export async function handleRfq(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = rfqSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;

  const [industrySlug, categoryName] = data.categoryKey.split("::");
  const industry = getIndustryBySlug(industrySlug);
  const reference = `TVX-${randomUUID().split("-")[0].toUpperCase()}`;

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from("rfq_submissions").insert({
      reference,
      company_name: data.companyName,
      contact_name: data.contactName,
      email: data.email,
      whatsapp: data.whatsapp,
      import_country: data.importCountry,
      destination_port: data.destinationPort,
      industry_slug: industrySlug ?? null,
      category_name: categoryName ?? null,
      hs_code: data.hsCode,
      quantity: data.quantity,
      unit: data.unit,
      price_band: data.priceBand || null,
      incoterm: data.incoterm,
      delivery_start: data.deliveryStart,
      delivery_end: data.deliveryEnd,
      sample_required: data.sampleRequired === "yes",
      notes: data.notes || null,
    });
    if (error) {
      console.error("Supabase insert failed for RFQ", reference, error);
      return NextResponse.json({ error: "Could not store submission. Please try again." }, { status: 502 });
    }
  } else {
    console.warn(`SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not configured — RFQ ${reference} was not persisted.`);
  }

  const resend = getResend();
  if (resend) {
    const catalogPath = industry ? path.join(process.cwd(), "public", "catalogs", `${industry.slug}.pdf`) : null;
    const hasCatalog = catalogPath ? fs.existsSync(catalogPath) : false;

    // Buyer-supplied spec sheets / drawings ride to sales as attachments.
    const buyerAttachments = (data.attachments ?? []).map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.contentBase64, "base64"),
    }));

    try {
      await resend.emails.send({
        from: `Trivoxa RFQ <${CONTACT.rfqSender}>`,
        to: CONTACT.sales,
        subject: `New RFQ ${reference} — ${industry?.name ?? "Unknown Industry"}`,
        html: salesNotificationHtml(data, reference, industry?.name ?? industrySlug, categoryName ?? data.categoryKey),
        attachments: buyerAttachments.length > 0 ? buyerAttachments : undefined,
      });
      await resend.emails.send({
        from: `Trivoxa Group <${CONTACT.rfqSender}>`,
        to: data.email,
        subject: `RFQ Received — Reference #${reference}`,
        html: autoReplyHtml(reference, data.contactName),
        attachments: hasCatalog && catalogPath ? [{ filename: `${industry!.slug}-catalog.pdf`, content: fs.readFileSync(catalogPath) }] : undefined,
      });
    } catch (err) {
      console.error("Resend email failed for RFQ", reference, err);
    }
  } else {
    console.warn(`RESEND_API_KEY not configured — RFQ ${reference} emails were not sent.`);
  }

  return NextResponse.json({ reference });
}
