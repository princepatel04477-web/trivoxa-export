"use client";

import { useState } from "react";
import { contactSchema } from "@/lib/validation/contact";
import { useRouter } from "@/i18n/navigation";

type Status = "idle" | "submitting" | "success" | "error";

export default function ContactForm({
  className,
  redirectOnSuccess = false,
}: {
  className?: string;
  /** Navigate to /thank-you on success instead of showing the inline
   * confirmation. Set only for the standalone /contact page — the modal
   * keeps the inline message, since navigating away out from under an open
   * modal is jarring UX. */
  redirectOnSuccess?: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());
    const parsed = contactSchema.safeParse(raw);
    if (!parsed.success) {
      setStatus("error");
      setError(parsed.error.issues[0]?.message ?? "Please check the form and try again");
      return;
    }

    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) throw new Error();
      form.reset();
      if (redirectOnSuccess) {
        router.push("/thank-you");
        return;
      }
      setStatus("success");
    } catch {
      setStatus("error");
      setError("Something went wrong sending your message. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className={`contact-form ${className ?? ""}`}>
        <p className="form-status form-status--success" role="status">
          Message sent — our team will get back to you within 24 business hours (IST).
        </p>
      </div>
    );
  }

  return (
    <form className={`contact-form ${className ?? ""}`} onSubmit={handleSubmit}>
      {/* The design carries no visible labels, and a <label> wrapping only an
          input contributes no text — so each control had no accessible name at
          all ("edit, blank" to a screen reader). A placeholder is not a label:
          it disappears on first keystroke. aria-label supplies the name without
          changing a pixel. */}
      <label className="form-field">
        <input type="text" name="fullName" aria-label="Full name" placeholder="Full Name" required minLength={2} autoComplete="name" />
      </label>
      <label className="form-field">
        <input type="text" name="companyName" aria-label="Company name" placeholder="Company Name" autoComplete="organization" />
      </label>
      <label className="form-field">
        <input type="email" name="email" aria-label="Your email address" placeholder="Your email address" required autoComplete="email" />
      </label>
      <label className="form-field">
        <textarea name="message" aria-label="How could we help you?" placeholder="How could we help you?" rows={4} required minLength={5} />
      </label>
      {status === "error" && error && (
        <p className="form-status form-status--error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="form-submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending…" : "Send Now"}
      </button>
    </form>
  );
}
