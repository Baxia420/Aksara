import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const policyItems = [
  "Use Aksara only for academic planning, coursework tracking, and related personal study activity.",
  "Keep your account information private and do not attempt to access another user's data.",
  "Do not upload or enter harmful, abusive, misleading, or unlawful content into the system.",
  "Respect shared schedules, group task records, and any course data that belongs to other collaborators.",
  "The administrator may suspend access if the site is used in ways that risk data loss, misuse, or disruption.",
];

export default function AcceptableUsePolicyPage() {
  return (
    <main className="min-h-screen px-4 py-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-4 py-2 text-sm font-semibold text-maroon-bright shadow-[0_10px_24px_rgba(131,16,62,0.06)] transition hover:border-line hover:text-maroon-deep"
        >
          <ArrowLeft className="size-4" />
          Back to sign in
        </Link>

        <section className="aksara-card mt-6 px-6 py-7 sm:px-10 sm:py-10">
          <p className="aksara-mono text-[0.66rem] text-maroon-soft">
            Aksara / Policy
          </p>
          <h1 className="aksara-serif mt-4 text-[3.2rem] leading-[0.9] text-ink sm:text-[4.4rem]">
            Acceptable Use
            <br />
            <span className="italic text-maroon-bright">Policy.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-body">
            This site is intended to help manage coursework, deadlines, and
            academic planning in a calm, organized way.
          </p>

          <div className="mt-8 space-y-4">
            {policyItems.map((item, index) => (
              <article
                key={item}
                className="rounded-[1.5rem] border border-line bg-surface/75 px-5 py-5 shadow-[0_10px_24px_rgba(131,16,62,0.04)]"
              >
                <p className="aksara-mono text-[0.56rem] text-gold">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <p className="mt-3 text-base leading-7 text-ink-body">{item}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
