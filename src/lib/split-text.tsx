import { Fragment } from "react";

/**
 * Server-rendered character splits for the hero headline and its supporting
 * copy.
 *
 * MASKED, not just faded. Each word is wrapped in an `overflow: hidden`
 * inline-block and each glyph inside it is a separate span, so a glyph tweened
 * from `yPercent: 120` rises out from behind the word's own bottom edge. That
 * mask is the whole difference between a headline that RESOLVES and one that
 * fades up: without it the glyphs simply appear, and a per-character stagger on
 * an appearance reads as a flicker rather than as a reveal.
 *
 * The wrapper is a real element rather than a Fragment for exactly that reason
 * — a Fragment has no box, so there is nothing to clip against.
 *
 * Split on the SERVER. The alternative (splitting after mount) leaves the
 * headline unstyled for a frame and hands a crawler a single text node it then
 * has to re-read once JS runs; this way the markup is stable from first paint
 * and the glyph spans are what hydrate.
 */
function splitChars(text: string, maskClass: string, spanClass: string) {
  return text.split(" ").map((word, wi) => (
    <Fragment key={wi}>
      {wi > 0 && " "}
      <span className={maskClass}>
        {word.split("").map((ch, ci) => (
          <span key={ci} className={spanClass}>
            {ch}
          </span>
        ))}
      </span>
    </Fragment>
  ));
}

export function TitleChars({ text }: { text: string }) {
  return <>{splitChars(text, "word_mask", "word_inner")}</>;
}

export function PChars({ text }: { text: string }) {
  return <>{splitChars(text, "p_mask", "p_inner")}</>;
}
