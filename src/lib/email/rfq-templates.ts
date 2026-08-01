import type { RfqInput } from "@/lib/validation/rfq";
import { CONTACT } from "@/data/contact";

function row(label: string, value: string) {
  return `<tr><td style="padding:6px 16px 6px 0;color:#6b6b6b;font-size:13px;white-space:nowrap;">${label}</td><td style="padding:6px 0;font-size:14px;font-weight:600;">${value}</td></tr>`;
}

export function salesNotificationHtml(data: RfqInput, reference: string, industryName: string, categoryName: string) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111;">
    <h2 style="margin:0 0 4px;">New RFQ — ${reference}</h2>
    <p style="color:#6b6b6b;margin:0 0 24px;">${industryName} · ${categoryName}</p>
    <table cellpadding="0" cellspacing="0">
      ${row("Company", data.companyName)}
      ${row("Contact", data.contactName)}
      ${row("Email", data.email)}
      ${row("WhatsApp", data.whatsapp)}
      ${row("Import Country", data.importCountry)}
      ${row("Destination Port", data.destinationPort)}
      ${row("HS Code", data.hsCode)}
      ${row("Quantity", `${data.quantity} ${data.unit}`)}
      ${row("Target Price Band", data.priceBand || "—")}
      ${row("Incoterm", data.incoterm)}
      ${row("Delivery Window", `${data.deliveryStart} to ${data.deliveryEnd}`)}
      ${row("Sample Required", data.sampleRequired === "yes" ? "Yes" : "No")}
    </table>
    ${data.notes ? `<p style="margin-top:24px;"><strong>Notes:</strong><br/>${data.notes}</p>` : ""}
  </div>`;
}

export function autoReplyHtml(reference: string, contactName: string) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111;">
    <p>Hi ${contactName},</p>
    <p>RFQ received. Reference <strong>#${reference}</strong>. Our team responds within 24 business hours (IST).</p>
    <p style="margin-top:24px;color:#6b6b6b;font-size:13px;">Trivoxa Group · ${CONTACT.sales}</p>
  </div>`;
}
