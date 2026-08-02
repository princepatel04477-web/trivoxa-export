"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

export interface TeaserTopic {
  title: string;
  category: string;
  readingTime: string;
  description: string;
}

/** Honest pre-launch Insights (spec §4): the articles aren't written yet, so
 * instead of dead "Read Insight" links this renders the planned topics with
 * vote checkboxes + email capture. Votes ride along with the subscription to
 * the team, so what gets written first is genuinely reader-driven. */
export default function InsightsTeaser({ topics }: { topics: TeaserTopic[] }) {
  const t = useTranslations("insightsPage.teaser");
  const [picked, setPicked] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  const toggle = (title: string) =>
    setPicked((cur) => (cur.includes(title) ? cur.filter((t) => t !== title) : [...cur, title]));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setState("busy");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, topics: picked }),
      });
      if (!res.ok) throw new Error();
      setState("done");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="insights-teaser">
      <div className="insights-teaser__grid">
        {topics.map((topic) => {
          const isPicked = picked.includes(topic.title);
          return (
            <article key={topic.title} className={`insights-teaser__card${isPicked ? " is-picked" : ""}`}>
              <header>
                <span className="insights-teaser__tag">{topic.category}</span>
                <span className="insights-teaser__time">{topic.readingTime}</span>
              </header>
              <h3>{topic.title}</h3>
              <p>{topic.description}</p>
              <label className="insights-teaser__vote">
                <input type="checkbox" checked={isPicked} onChange={() => toggle(topic.title)} />
                <span>{isPicked ? t("voteOn") : t("voteWant")}</span>
              </label>
            </article>
          );
        })}
      </div>

      {state === "done" ? (
        <p className="insights-teaser__thanks" role="status">
          {t("thanksBase")}
          {picked.length > 0 ? (picked.length === 1 ? t("thanksVoteSingle") : t("thanksVotePlural")) : ""}
          {t("thanksEnd")}
        </p>
      ) : (
        <form className="insights-teaser__form" onSubmit={submit}>
          <p className="insights-teaser__form-lead">
            {picked.length > 0
              ? (picked.length === 1 ? t("notifyLeadSingle") : t("notifyLeadPlural"))
              : t("notifyLeadNone")}
          </p>
          <div className="insights-teaser__form-row">
            <input
              type="email"
              required
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label={t("emailAria")}
            />
            <button type="submit" disabled={state === "busy"} data-analytics="insights-teaser-subscribe">
              {state === "busy" ? t("sending") : t("notifyMe")}
            </button>
          </div>
          {state === "error" && (
            <p className="insights-teaser__error" role="alert">
              {t("errorGeneric")}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
