import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen px-4 py-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-[#e7d7dc] bg-white/80 px-4 py-2 text-sm font-semibold text-[#7a2347] shadow-[0_10px_24px_rgba(131,16,62,0.06)] transition hover:border-[#d8b5c1] hover:text-[#5f1737]"
        >
          <ArrowLeft className="size-4" />
          Back to sign in
        </Link>

        <section className="aksara-card mt-6 px-6 py-10 text-center sm:px-10 sm:py-14">
          <p className="aksara-mono text-[0.66rem] text-[#b24e72]">
            Account Support
          </p>
          <h1 className="aksara-serif mt-4 text-[3rem] leading-[0.9] text-[#26171e] sm:text-[4.2rem]">
            Please contact
            <br />
            <span className="italic text-[#a31657]">the administrator.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-[#6c5962]">
            If you cannot access your account or need your password reset,
            please contact the administrator for assistance.
          </p>
        </section>
      </div>
    </main>
  );
}
