/** Canonical contact data (PTO-04). Single source for every email address
 * and (once supplied) phone number used sitewide — no mailto: literal or
 * bare email/phone string should exist outside this module.
 *
 * Chairman decision (2026-07-31, D3): keep the current mixed email set as-is
 * rather than adopting the directive's suggested hello@/sales@/careers@
 * convention — Careers keeps routing to the co-founder's address below.
 *
 * Phone number is intentionally absent: no phone number exists anywhere in
 * the repo today, and one must not be invented (Chairman decision D2 is
 * still pending). CONTACT.phone stays `null` until supplied — every consumer
 * must handle the null case (e.g. omit the "Call us" row) rather than
 * rendering a placeholder.
 */

export const CONTACT = {
  /** General enquiries — displayed on Contact/About pages. */
  general: "hello@trivoxagroup.com",
  /** Commercial/RFQ backend target (contact form + RFQ submissions route here). */
  sales: "sales@trivoxagroup.com",
  /** Careers — Chairman confirmed (D3) this stays a named founder address,
   * not a careers@ alias. */
  careers: "dhruv@trivoxagroup.com",
  /** Transactional sender address (contact-form confirmations). */
  noReply: "no-reply@trivoxagroup.com",
  /** Transactional sender address for RFQ emails specifically. */
  rfqSender: "rfq@trivoxagroup.com",
  /** [CHAIRMAN — D2] Public phone number(s). Not yet supplied — do not
   * fabricate. Every consumer must treat this as optional. */
  phone: null as string | null,
  /** [CHAIRMAN — D2] Stated business hours + timezone. Not yet supplied. */
  hours: null as string | null,
  /** [CHAIRMAN — D6] Registered legal entity number. Not yet supplied. */
  entityNumber: null as string | null,
  /** [CHAIRMAN — D6] Registered office address (full, for legal/Compliance
   * publication) — distinct from the shorter "Surat, Gujarat, India"
   * operating-location copy used elsewhere, which stays as-is. */
  registeredOffice: null as string | null,
} as const;

export function mailto(address: string, subject?: string): string {
  return subject ? `mailto:${address}?subject=${encodeURIComponent(subject)}` : `mailto:${address}`;
}
