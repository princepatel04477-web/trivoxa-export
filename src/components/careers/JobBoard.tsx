"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { openings, type JobOpening } from "@/lib/data/openings";
import { CONTACT, mailto } from "@/data/contact";
import EmptyState from "@/components/EmptyState";

function Drawer({ job, onClose }: { job: JobOpening | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {job && (
        <>
          <motion.div
            className="ind-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            className="ind-drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label={`${job.title} — full role description`}
          >
            <button className="ind-drawer__close" onClick={onClose}>
              Close ✕
            </button>
            <span className="ind-drawer__eyebrow">
              {job.department} — {job.location} — {job.employmentType} — {job.remoteOption}
            </span>
            <h3>{job.title}</h3>
            <p className="job-drawer__desc">{job.description}</p>
            <dl>
              <div>
                <dt>Responsibilities</dt>
                <dd>
                  <ul className="job-drawer__list">
                    {job.responsibilities.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div>
                <dt>Requirements</dt>
                <dd>
                  <ul className="job-drawer__list">
                    {job.requirements.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </dd>
              </div>
              {job.niceToHave && job.niceToHave.length > 0 && (
                <div>
                  <dt>Nice to Have</dt>
                  <dd>
                    <ul className="job-drawer__list">
                      {job.niceToHave.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
            </dl>
            <a
              className="tvx-btn tvx-btn--primary ind-drawer__specsheet"
              href={mailto(CONTACT.careers, `Application — ${job.title} (${job.id})`)}
            >
              Apply for This Role
            </a>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Careers opportunities board: hairline table of open roles with a
 * full-JD drawer, or an honest empty state + open-application CTA when
 * no roles are seeded. */
export default function JobBoard() {
  const [active, setActive] = useState<JobOpening | null>(null);

  if (openings.length === 0) {
    return (
      <EmptyState
        status="There are no open roles listed right now."
        timing="We review open applications continuously, not on a fixed hiring cycle."
        action={{ label: "Submit an Open Application", href: mailto(CONTACT.careers, "Open Application — Trivoxa Group"), external: true }}
      />
    );
  }

  return (
    <>
      <div className="ind-table-wrap">
        <table className="ind-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Department</th>
              <th>Location</th>
              <th>Type</th>
              <th aria-label="Open role" />
            </tr>
          </thead>
          <tbody>
            {openings.map((job) => (
              <tr
                key={job.id}
                tabIndex={0}
                role="button"
                onClick={() => setActive(job)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setActive(job)}
              >
                <td>{job.title}</td>
                <td className="mono">{job.department}</td>
                <td className="mono">{job.location}</td>
                <td className="mono">{job.employmentType}</td>
                <td className="mono job-board__view">View Role →</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Drawer job={active} onClose={() => setActive(null)} />
    </>
  );
}
