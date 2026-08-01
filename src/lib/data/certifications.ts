/** Canonical certification/compliance status (single source for the
 * Compliance page's CertificationsStrip and for CRA-05's certification-gated
 * RFQ categories). Honest maturity model: operational licensing is ACTIVE,
 * sector certs are being secured with target dates. Verified credentials
 * will later link to PDFs (registration number, authority, legal entity,
 * validity period). */

export type CertState = "active" | "in-application" | "target";

export interface CertMark {
  code: string;
  name: string;
  state: CertState;
  detail: string;
}

export const ACTIVE_MARKS: CertMark[] = [
  { code: "IEC", name: "Import Export Code", state: "active", detail: "Active" },
  { code: "GST", name: "Goods & Services Tax Registration", state: "active", detail: "Active" },
];

export const IN_PROGRESS_MARKS: CertMark[] = [
  { code: "FIEO", name: "Federation of Indian Export Organisations", state: "in-application", detail: "In application — target Q4 2026" },
  { code: "APEDA", name: "Agricultural & Processed Food Products Export Development Authority", state: "in-application", detail: "In application — target Q4 2026" },
  { code: "FSSAI", name: "Food Safety & Standards Authority of India", state: "in-application", detail: "In application — target Q1 2027" },
  { code: "ISO 9001", name: "Quality Management System", state: "in-application", detail: "In application — target Q1 2027" },
  { code: "Spice Board", name: "Spices Board of India", state: "in-application", detail: "In application — target Q4 2026" },
  { code: "CE", name: "CE Marking (EU Conformity)", state: "target", detail: "Targeted for EU-bound lines" },
  { code: "WHO-GMP", name: "WHO Good Manufacturing Practice", state: "target", detail: "Targeted for pharma lines" },
];

export const certifications: CertMark[] = [...ACTIVE_MARKS, ...IN_PROGRESS_MARKS];

export function getCertification(code: string): CertMark | undefined {
  return certifications.find((c) => c.code === code);
}
