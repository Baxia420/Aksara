import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen px-4 py-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-4 py-2 text-sm font-semibold text-maroon-bright shadow-[0_10px_24px_rgba(131,16,62,0.06)] transition hover:border-line hover:text-maroon-deep"
        >
          <ArrowLeft className="size-4" />
          Back to sign in
        </Link>

        <section className="aksara-card mt-6 px-6 py-10 text-center sm:px-10 sm:py-14">
          <p className="aksara-mono text-[0.66rem] text-maroon-soft">
            Account Support
          </p>
          <h1 className="aksara-serif mt-4 text-[3rem] leading-[0.9] text-ink sm:text-[4.2rem]">
            Please contact
            <br />
            <span className="italic text-maroon-bright">the administrator.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-ink-body">
            If you cannot access your account or need your password reset,
            please contact the administrator for assistance.
          </p>
        </section>
      </div>
    </main>
  );
}
