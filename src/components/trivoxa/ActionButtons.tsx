"use client";

import Link from "next/link";
import { emit } from "@/lib/site-events";

/**
 * A CTA either routes somewhere or opens the quote modal — never neither.
 *
 * Modelled as a union rather than two optional fields so an action with no
 * destination is a compile error. It used to fall back to `href="#"`, which is
 * exactly the dead anchor a buyer must never be handed.
 */
export type Action =
  | { label: string; href: string; modal?: false; variant?: "primary" | "ghost" }
  | { label: string; href?: never; modal: true; variant?: "primary" | "ghost" };

export default function ActionButtons({ actions }: { actions: Action[] }) {
  return (
    <div className="tvx-btns">
      {actions.map((a, i) => {
        const cls = `tvx-btn tvx-btn--${a.variant ?? (i === 0 ? "primary" : "ghost")}`;
        if (a.modal) {
          return (
            <button key={i} type="button" className={cls} onClick={() => emit("modal:open")}>
              {a.label}
            </button>
          );
        }
        return (
          <Link key={i} href={a.href} className={cls}>
            {a.label}
          </Link>
        );
      })}
    </div>
  );
}
