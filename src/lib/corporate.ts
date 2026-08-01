/** Canonical corporate-relationship language (PTO-01). Chairman-confirmed:
 * Shiveshwar Textiles is an independent strategic manufacturing partner, NOT
 * a parent company — no equity/legal parent-subsidiary relationship exists.
 * Every sentence sitewide that describes the relationship reads from these
 * constants so there is exactly one place to correct if the answer changes. */

export const SHIVESHWAR_NAME = "Shiveshwar Textiles";

/** Short noun phrase — drop-in replacement for "parent company" wherever the
 * relationship is named directly (e.g. "our SHIVESHWAR_RELATIONSHIP"). */
export const SHIVESHWAR_RELATIONSHIP = "founding strategic manufacturing partner";

/** One-sentence descriptor for "strengths" list items and short intros. */
export const SHIVESHWAR_DESCRIPTOR =
  "Built upon the manufacturing expertise of our founding strategic partner, Shiveshwar Textiles.";

/** Longer descriptor for section intros that need a full sentence of context. */
export const SHIVESHWAR_FOUNDATION_LINE =
  "Trivoxa Group was founded in strategic partnership with Shiveshwar Textiles, a manufacturing company with extensive expertise in woven textile production and quality-focused operations.";
