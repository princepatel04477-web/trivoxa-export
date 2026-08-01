import { Link } from "@/i18n/navigation";
import "@/app/styles/empty-state.css";

interface EmptyStateAction {
  label: string;
  href: string;
  /** Absolute/external/mailto hrefs skip the locale-aware <Link>. */
  external?: boolean;
}

/** Single honest empty-state pattern (CAS-05) — status line, optional
 * timing, one useful action. Used wherever a category, article list, or
 * role list has nothing to show yet, so the site never improvises a new
 * "coming soon" treatment per page. Never render this behind a homepage
 * preview — gate the preview itself instead (see HEP-05). */
export default function EmptyState({
  status,
  timing,
  action,
}: {
  status: string;
  timing?: string;
  action?: EmptyStateAction;
}) {
  return (
    <div className="empty-state">
      <p className="empty-state__status">{status}</p>
      {timing && <p className="empty-state__timing">{timing}</p>}
      {action &&
        (action.external ? (
          <a className="tvx-btn tvx-btn--primary empty-state__action" href={action.href}>
            {action.label}
          </a>
        ) : (
          <Link className="tvx-btn tvx-btn--primary empty-state__action" href={action.href}>
            {action.label}
          </Link>
        ))}
    </div>
  );
}
