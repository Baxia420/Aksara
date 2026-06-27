import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const noticeItems = [
  "Aksara may store account identifiers, task records, course details, and scheduling information you enter.",
  "This information is used only to provide your academic dashboard and related planning features.",
  "Access to stored data should be limited to authorized users and the site administrator.",
  "Personal information should not be shared publicly or reused for unrelated purposes without permission.",
  "If this notice changes in the future, the updated version should be published here.",
];

export default function PrivacyNoticePage() {
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
            Aksara / Privacy
          </p>
          <h1 className="aksara-serif mt-4 text-[3.2rem] leading-[0.9] text-ink sm:text-[4.4rem]">
            Privacy
            <br />
            <span className="italic text-maroon-bright">Notice.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-body">
            This page explains, at a simple level, what information the site
            may hold and how it should be treated.
          </p>

          <div className="mt-8 space-y-4">
            {noticeItems.map((item, index) => (
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
