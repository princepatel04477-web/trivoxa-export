"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { getAllCategoriesWithIndustry } from "@/lib/data/industries";
import { getCertification } from "@/lib/data/certifications";
import {
  INCOTERMS,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  QUANTITY_UNITS,
  rfqCompanySchema,
  rfqProductSchema,
  rfqSchema,
  rfqTermsSchema,
} from "@/lib/validation/rfq";
import LazyCrane from "@/components/LazyCrane";

const STEPS = ["Company", "Product", "Terms"] as const;

/** Which conversation the visitor wants to have (spec §4 — RFQ paths). */
type RfqPath = "product" | "service" | "partnership" | "career" | "audit";

const PATHS: { key: RfqPath; title: string; desc: string }[] = [
  { key: "product", title: "Product Export RFQ", desc: "Source products with HS codes, MOQs, and a formal quotation." },
  { key: "service", title: "Service Engagement", desc: "Technology, AI, software, design, or marketing from Trivoxa Digital." },
  { key: "partnership", title: "Partnership", desc: "Manufacturing, logistics, or distribution partnerships with the Group." },
  { key: "audit", title: "Factory Audit / Site Visit", desc: "Request a supplier audit or site visit ahead of placing an order." },
  { key: "career", title: "Careers", desc: "Join the team — see open areas and send your application." },
];

interface Attachment {
  filename: string;
  mimeType: string;
  contentBase64: string;
  size: number;
}

interface FormState {
  companyName: string;
  contactName: string;
  email: string;
  whatsapp: string;
  importCountry: string;
  destinationPort: string;
  categoryKey: string;
  hsCode: string;
  quantity: string;
  unit: (typeof QUANTITY_UNITS)[number];
  priceBand: string;
  incoterm: (typeof INCOTERMS)[number];
  deliveryStart: string;
  deliveryEnd: string;
  sampleRequired: "yes" | "no";
  notes: string;
  attachments: Attachment[];
}

const categoryKeyOf = (industrySlug: string, categoryName: string) => `${industrySlug}::${categoryName}`;

const STEP_SCHEMAS = [rfqCompanySchema, rfqProductSchema, rfqTermsSchema];

export default function RfqForm() {
  const searchParams = useSearchParams();
  const categoryOptions = useMemo(() => getAllCategoriesWithIndustry(), []);
  const presetSlug = searchParams.get("category");
  // Products picked in the catalog grid arrive as ?products=A|B|C.
  const presetProducts = useMemo(
    () => (searchParams.get("products") ?? "").split("|").map((s) => s.trim()).filter(Boolean),
    [searchParams]
  );
  // CAS-06: "Request Sample" CTAs on category pages link here with
  // ?sample=1 — pre-selects the Product path and the Sample Required toggle
  // instead of opening a separate form.
  const presetSample = searchParams.get("sample") === "1";
  // CAS-07: Factory Audit / Site Visit CTAs (Group Foundation, Compliance)
  // link here with ?path=audit to land directly on that enquiry type.
  const rawPresetPath = searchParams.get("path");
  const presetPath: RfqPath | null =
    rawPresetPath === "service" || rawPresetPath === "partnership" || rawPresetPath === "audit" || rawPresetPath === "career"
      ? rawPresetPath
      : null;

  const initial = useMemo(() => {
    // A picked product wins; else the ?category= industry; else the first.
    const byProduct = presetProducts.length
      ? categoryOptions.find((c) => c.category.name === presetProducts[0])
      : undefined;
    return byProduct ?? categoryOptions.find((c) => c.industrySlug === presetSlug) ?? categoryOptions[0];
  }, [categoryOptions, presetSlug, presetProducts]);

  const [path, setPath] = useState<RfqPath | null>(
    presetPath ?? (presetProducts.length || presetSlug ? "product" : null)
  );
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    companyName: "",
    contactName: "",
    email: "",
    whatsapp: "",
    importCountry: "",
    destinationPort: "",
    categoryKey: initial ? categoryKeyOf(initial.industrySlug, initial.category.name) : "",
    hsCode: initial?.category.hsCode ?? "",
    quantity: "",
    unit: "MT",
    priceBand: "",
    incoterm: "FOB",
    deliveryStart: "",
    deliveryEnd: "",
    sampleRequired: presetSample ? "yes" : "no",
    notes: presetProducts.length ? `Products of interest: ${presetProducts.join(", ")}` : "",
    attachments: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  // Once the RFQ is on its way, the catalog basket has served its purpose.
  useEffect(() => {
    if (reference) {
      try {
        sessionStorage.removeItem("trivoxa-rfq-basket");
      } catch {
        /* ignore */
      }
    }
  }, [reference]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onCategoryChange(key: string) {
    const match = categoryOptions.find((c) => categoryKeyOf(c.industrySlug, c.category.name) === key);
    setForm((f) => ({ ...f, categoryKey: key, hsCode: match?.category.hsCode ?? f.hsCode }));
  }

  /** HS/MOQ helper — the catalog entry backing the selected category. */
  const selectedCategory = useMemo(
    () => categoryOptions.find((c) => categoryKeyOf(c.industrySlug, c.category.name) === form.categoryKey),
    [categoryOptions, form.categoryKey]
  );

  async function addFiles(list: FileList | null) {
    if (!list) return;
    setErrors((e) => ({ ...e, attachments: "" }));
    const current = [...form.attachments];
    for (const file of Array.from(list)) {
      if (current.length >= MAX_ATTACHMENTS) {
        setErrors((e) => ({ ...e, attachments: `Maximum ${MAX_ATTACHMENTS} files.` }));
        break;
      }
      const totalAfter = current.reduce((s, a) => s + a.size, 0) + file.size;
      if (totalAfter > MAX_ATTACHMENT_BYTES) {
        setErrors((e) => ({ ...e, attachments: "Combined attachments must stay under 4 MB." }));
        break;
      }
      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      current.push({ filename: file.name, mimeType: file.type || "application/octet-stream", contentBase64, size: file.size });
    }
    update("attachments", current);
  }

  function validateStep(index: number): boolean {
    const parsed = STEP_SCHEMAS[index].safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        fieldErrors[String(issue.path[0])] = issue.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    const parsed = rfqSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        fieldErrors[String(issue.path[0])] = issue.message;
      });
      setErrors(fieldErrors);
      const failingStep = STEP_SCHEMAS.findIndex((schema) => !schema.safeParse(form).success);
      if (failingStep !== -1) setStep(failingStep);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/rfq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Submission failed. Please try again.");
      setReference(json.reference);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------- Success ---------- */
  if (reference) {
    return (
      <div className="rfq-confirm">
        <LazyCrane variant="success" />
        <span className="tvx-eyebrow">RFQ Received</span>
        <h2>Reference #{reference}</h2>
        <p>Our team responds within 24 business hours (IST) via the email and WhatsApp number you provided.</p>
        <div className="rfq-confirm__next">
          <span className="ind-drawer__eyebrow">What Happens Next</span>
          <ol>
            <li>Our sourcing team reviews your requirement against current factory capacity.</li>
            <li>You receive a formal quotation with pricing, lead time, and payment terms.</li>
            <li>Once confirmed, we issue a proforma invoice and begin production scheduling.</li>
          </ol>
        </div>
        <Link className="tvx-btn tvx-btn--primary" href="/industries/">
          Browse More Industries
        </Link>
      </div>
    );
  }

  /* ---------- Path picker ---------- */
  if (!path) {
    return (
      <div className="rfq-paths" role="group" aria-label="What would you like to discuss?">
        {PATHS.map((p) => (
          <button key={p.key} type="button" className="rfq-path-card" onClick={() => setPath(p.key)}>
            <h3>{p.title}</h3>
            <p>{p.desc}</p>
            <span aria-hidden="true">→</span>
          </button>
        ))}
      </div>
    );
  }

  if (path === "career") {
    return (
      <div className="rfq-confirm">
        <span className="tvx-eyebrow">Careers</span>
        <h2>We&rsquo;d love to hear from you.</h2>
        <p>Open areas, culture, and the application form live on our careers page.</p>
        <div className="rfq-actions">
          <button type="button" className="tvx-btn tvx-btn--ghost" onClick={() => setPath(null)}>
            Back
          </button>
          <Link className="tvx-btn tvx-btn--primary" href="/careers/">
            Go to Careers →
          </Link>
        </div>
      </div>
    );
  }

  if (path === "service" || path === "partnership" || path === "audit") {
    return <InquiryForm kind={path} onBack={() => setPath(null)} />;
  }

  /* ---------- Product RFQ (3 steps) ---------- */
  return (
    <div className="rfq-form">
      <button type="button" className="rfq-path-back" onClick={() => setPath(null)}>
        ← Change enquiry type
      </button>

      <div className="rfq-progress">
        <div className="rfq-progress__bar">
          <div className="rfq-progress__fill" style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
        </div>
        {STEPS.map((label, i) => (
          <div key={label} className={`rfq-progress__step${i <= step ? " is-active" : ""}`}>
            <span className="rfq-progress__n">{String(i + 1).padStart(2, "0")}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {step === 0 && (
            <div className="rfq-grid">
              <Field label="Company Name" error={errors.companyName}>
                <input value={form.companyName} onChange={(e) => update("companyName", e.target.value)} />
              </Field>
              <Field label="Contact Name" error={errors.contactName}>
                <input value={form.contactName} onChange={(e) => update("contactName", e.target.value)} />
              </Field>
              <Field label="Business Email" error={errors.email}>
                <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
              </Field>
              <Field label="WhatsApp Number" error={errors.whatsapp}>
                <PhoneInput international defaultCountry="IN" value={form.whatsapp} onChange={(v) => update("whatsapp", v ?? "")} />
              </Field>
              <Field label="Country of Import" error={errors.importCountry}>
                <input value={form.importCountry} onChange={(e) => update("importCountry", e.target.value)} />
              </Field>
            </div>
          )}

          {step === 1 && (
            <>
              {presetProducts.length > 0 && (
                <p className="rfq-preset-note">
                  From your catalog selection: <strong>{presetProducts.join(", ")}</strong> — details carried into the
                  notes for our sourcing team.
                </p>
              )}
              <div className="rfq-grid">
                <Field label="Destination Port" error={errors.destinationPort}>
                  <input value={form.destinationPort} onChange={(e) => update("destinationPort", e.target.value)} />
                </Field>
                <Field label="Product Category" error={errors.categoryKey}>
                  <select value={form.categoryKey} onChange={(e) => onCategoryChange(e.target.value)}>
                    {categoryOptions.map((c) => (
                      <option key={categoryKeyOf(c.industrySlug, c.category.name)} value={categoryKeyOf(c.industrySlug, c.category.name)}>
                        {c.industryName} — {c.category.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="HS Code" error={errors.hsCode}>
                  <input value={form.hsCode} onChange={(e) => update("hsCode", e.target.value)} />
                </Field>
                <Field label="Quantity" error={errors.quantity}>
                  <input type="number" min="0" step="any" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} />
                </Field>
                <Field label="Unit">
                  <select value={form.unit} onChange={(e) => update("unit", e.target.value as FormState["unit"])}>
                    {QUANTITY_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Target Price Band (optional)">
                  <input placeholder="e.g. $2.10–$2.40 / kg" value={form.priceBand} onChange={(e) => update("priceBand", e.target.value)} />
                </Field>
              </div>
              {selectedCategory && (
                <p className="rfq-helper" role="note">
                  Catalog reference for {selectedCategory.category.name}: typical MOQ{" "}
                  <strong>{selectedCategory.category.moq}</strong> · lead time{" "}
                  <strong>{selectedCategory.category.leadTime}</strong> · HS{" "}
                  <strong>{selectedCategory.category.hsCode}</strong>. Quantities below the MOQ are quoted case by
                  case — submit anyway and we&rsquo;ll advise.
                </p>
              )}
              {selectedCategory?.category.requiresCert && selectedCategory.category.requiresCert.length > 0 && (
                <p className="rfq-helper rfq-helper--cert" role="note">
                  Certification status for {selectedCategory.category.name}:{" "}
                  {selectedCategory.category.requiresCert
                    .map((code) => {
                      const cert = getCertification(code);
                      return cert ? `${cert.code} — ${cert.detail}` : code;
                    })
                    .join(" · ")}
                  . We can still log your requirement now; export is contingent on certification completing. See{" "}
                  <Link href="/compliance/">our full compliance posture →</Link>
                </p>
              )}
            </>
          )}

          {step === 2 && (
            <div className="rfq-grid">
              <Field label="Preferred Incoterm" error={errors.incoterm}>
                <select value={form.incoterm} onChange={(e) => update("incoterm", e.target.value as FormState["incoterm"])}>
                  {INCOTERMS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Delivery Window — From" error={errors.deliveryStart}>
                <input type="date" value={form.deliveryStart} onChange={(e) => update("deliveryStart", e.target.value)} />
              </Field>
              <Field label="Delivery Window — To" error={errors.deliveryEnd}>
                <input type="date" value={form.deliveryEnd} onChange={(e) => update("deliveryEnd", e.target.value)} />
              </Field>
              <Field label="Sample Required">
                <div className="rfq-toggle">
                  {(["yes", "no"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={form.sampleRequired === v ? "is-active" : ""}
                      onClick={() => update("sampleRequired", v)}
                    >
                      {v === "yes" ? "Yes" : "No"}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Additional Notes" full>
                <textarea rows={4} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
              </Field>
              <Field label={`Spec Sheets / Drawings (up to ${MAX_ATTACHMENTS} files, 4 MB total)`} full error={errors.attachments || undefined}>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.xls,.xlsx,.doc,.docx,.dwg,.dxf"
                  onChange={(e) => {
                    void addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                {form.attachments.length > 0 && (
                  <ul className="rfq-files">
                    {form.attachments.map((a) => (
                      <li key={a.filename}>
                        <span>
                          {a.filename} <em>({Math.round(a.size / 1024)} KB)</em>
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove ${a.filename}`}
                          onClick={() =>
                            update(
                              "attachments",
                              form.attachments.filter((x) => x.filename !== a.filename)
                            )
                          }
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Field>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {submitError && <p className="rfq-error">{submitError}</p>}

      <div className="rfq-actions">
        {step > 0 && (
          <button type="button" className="tvx-btn tvx-btn--ghost" onClick={goBack}>
            Back
          </button>
        )}
        {step < STEPS.length - 1 && (
          <button type="button" className="tvx-btn tvx-btn--primary" onClick={goNext}>
            Continue
          </button>
        )}
        {step === STEPS.length - 1 && (
          <button type="button" className="tvx-btn tvx-btn--primary" disabled={submitting} onClick={handleSubmit}>
            {submitting ? "Submitting…" : "Submit RFQ"}
          </button>
        )}
      </div>
    </div>
  );
}

const INQUIRY_TITLES: Record<"service" | "partnership" | "audit", string> = {
  service: "Service Engagement",
  partnership: "Partnership",
  audit: "Factory Audit / Site Visit",
};

const INQUIRY_PROMPTS: Record<"service" | "partnership" | "audit", string> = {
  service: "What do you want to build or achieve?",
  partnership: "What kind of partnership do you have in mind?",
  audit: "Which facility or product line, and when would you like to visit or audit?",
};

/** Service / partnership / factory-audit enquiry — a focused message form
 * into /api/contact (CAS-07: factory audit / site visit as a distinct RFQ
 * enquiry type, not a separate form). */
function InquiryForm({ kind, onBack }: { kind: "service" | "partnership" | "audit"; onBack: () => void }) {
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  const title = INQUIRY_TITLES[kind];

  async function submit() {
    if (!fullName.trim() || !email.trim() || message.trim().length < 10) {
      setError("Please add your name, a valid email, and a few sentences about your requirement.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          companyName,
          email,
          message: `[${title} enquiry]\n\n${message}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Submission failed. Please try again.");
      setReference(json.reference);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (reference) {
    return (
      <div className="rfq-confirm">
        <LazyCrane variant="success" />
        <span className="tvx-eyebrow">{title} Enquiry Received</span>
        <h2>Reference #{reference}</h2>
        <p>Our team responds within 24 business hours (IST).</p>
        <Link className="tvx-btn tvx-btn--primary" href={kind === "service" ? "/businesses/service-exports/" : kind === "audit" ? "/compliance/" : "/group/"}>
          {kind === "service" ? "Explore Service Exports" : kind === "audit" ? "See Our Compliance Posture" : "About the Group"}
        </Link>
      </div>
    );
  }

  return (
    <div className="rfq-form">
      <button type="button" className="rfq-path-back" onClick={onBack}>
        ← Change enquiry type
      </button>
      <div className="rfq-grid">
        <Field label="Your Name">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label="Company (optional)">
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </Field>
        <Field label="Business Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={INQUIRY_PROMPTS[kind]} full>
          <textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} />
        </Field>
      </div>
      {error && <p className="rfq-error">{error}</p>}
      <div className="rfq-actions">
        <button type="button" className="tvx-btn tvx-btn--primary" disabled={submitting} onClick={submit}>
          {submitting ? "Sending…" : `Send ${title} Enquiry`}
        </button>
      </div>
    </div>
  );
}

function Field({ label, error, full, children }: { label: string; error?: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`rfq-field${full ? " rfq-field--full" : ""}`}>
      <span className="rfq-field__label">{label}</span>
      {children}
      {error && <span className="rfq-field__error">{error}</span>}
    </label>
  );
}
