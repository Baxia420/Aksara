"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { ArrowRight, GraduationCap } from "lucide-react";

const loginHighlights = [
  {
    label: "01",
    title: "Sprint Timeline",
    copy: "Assignments, quizzes, and finals in one week-aware surface.",
  },
  {
    label: "02",
    title: "Group + Solo",
    copy: "Track both your group work and personal assignments.",
  },
  {
    label: "03",
    title: "Calmly Urgent",
    copy: "Color-coded pressure, but never alarmist.",
  },
];

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-maroon text-gold shadow-[0_12px_28px_rgba(131,16,62,0.18)]">
        <GraduationCap className="size-6 stroke-[2.2]" />
      </div>
      <div>
        <p className="aksara-serif text-[2rem] font-semibold leading-none text-maroon">
          Aksara
        </p>
        <p className="aksara-mono mt-1 text-[0.58rem] text-maroon-soft">
          Academic OS
        </p>
      </div>
    </div>
  );
}

function LoginForm({
  mobile = false,
  isSignUp,
  setIsSignUp,
}: {
  mobile?: boolean;
  isSignUp: boolean;
  setIsSignUp: (value: boolean) => void;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const errorId = mobile ? "login-error-mobile" : "login-error-desktop";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (isSignUp && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSignUp) {
        const response = await fetch("/api/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password, username, firstName, lastName }),
        });

        const data = (await response.json().catch(() => ({}))) as { message?: string };
        if (!response.ok) {
          setError(data.message ?? "Registration failed. Please try again.");
          return;
        }

        setSuccessMessage("Account created successfully! You can sign in immediately.");
        setIsSignUp(false);
        setPassword("");
        setFirstName("");
        setLastName("");
      } else {
        const response = await fetch("/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password, username }),
        });

        if (!response.ok) {
          const data = (await response
            .json()
            .catch(() => ({}))) as { message?: string };
          setError(data.message ?? "Invalid username or password.");
          return;
        }

        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Authentication error:", err);
      setError(
        err instanceof Error
          ? err.message
          : isSignUp
          ? "Unable to register right now."
          : "Unable to sign in right now."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className={`aksara-card relative w-full rounded-[2rem] ${
        mobile
          ? "max-w-[25rem] px-6 py-6"
          : "max-w-[35rem] px-7 py-8 sm:px-10 sm:py-10"
      }`}
    >
      {mobile ? null : (
        <div className="flex items-center justify-between gap-4">
          <p className="aksara-mono text-[0.62rem] text-maroon-soft">{isSignUp ? "Sign Up" : "Sign In"}</p>
          <div className="rounded-full border border-line bg-surface px-4 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-ink-soft">
            Secure
          </div>
        </div>
      )}

      {!mobile ? (
        <div className="mt-6">
          <h2 className="aksara-serif text-[3.2rem] leading-[0.85] text-ink sm:text-[4rem]">
            {isSignUp ? (
              <>
                Create
                <br />
                <span className="italic text-maroon-bright">account.</span>
              </>
            ) : (
              <>
                Welcome
                <br />
                <span className="italic text-maroon-bright">back.</span>
              </>
            )}
          </h2>
        </div>
      ) : null}

      <form
        className={`${mobile ? "mt-5 space-y-4" : "mt-7 space-y-5"}`}
        onSubmit={handleSubmit}
      >
        {isSignUp && (
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span
                className={`aksara-mono mb-2 block text-ink-soft ${
                  mobile ? "text-[0.55rem]" : "text-[0.62rem]"
                }`}
              >
                First Name
              </span>
              <input
                required
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="Jobayer"
                className={`w-full rounded-[1.15rem] border border-line bg-surface font-semibold text-ink-body outline-none transition focus:border-gold ${
                  mobile ? "px-4 py-3.5 text-base" : "px-5 py-4 text-lg"
                }`}
              />
            </label>
            <label className="block">
              <span
                className={`aksara-mono mb-2 block text-ink-soft ${
                  mobile ? "text-[0.55rem]" : "text-[0.62rem]"
                }`}
              >
                Last Name
              </span>
              <input
                required
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Alam"
                className={`w-full rounded-[1.15rem] border border-line bg-surface font-semibold text-ink-body outline-none transition focus:border-gold ${
                  mobile ? "px-4 py-3.5 text-base" : "px-5 py-4 text-lg"
                }`}
              />
            </label>
          </div>
        )}

        <label className="block">
          <span
            className={`aksara-mono mb-2 block text-ink-soft ${
              mobile ? "text-[0.55rem]" : "text-[0.62rem]"
            }`}
          >
            Email / UTMID
          </span>
          <input
            autoComplete="username"
            name="username"
            onChange={(event) => setUsername(event.target.value)}
            required
            type="text"
            value={username}
            placeholder="name@graduate.utm.my"
            className={`w-full rounded-[1.15rem] border border-line bg-surface font-semibold text-ink-body outline-none transition focus:border-gold ${
              mobile ? "px-5 py-3.5 text-base" : "px-5 py-4 text-lg"
            }`}
          />
        </label>

        <label className="block">
          <div className="mb-2 flex items-center justify-between gap-4">
            <span
              className={`aksara-mono block text-ink-soft ${
                mobile ? "text-[0.55rem]" : "text-[0.62rem]"
              }`}
            >
              Password
            </span>
            {!isSignUp && (
              <Link
                href="/forgot-password"
                className={`font-semibold text-maroon transition hover:text-maroon-deep ${
                  mobile ? "text-[0.92rem]" : "text-sm"
                }`}
              >
                Forgot Password
              </Link>
            )}
          </div>
          <input
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error ? "true" : "false"}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
            placeholder="Password"
            className={`w-full rounded-[1.15rem] border border-line bg-surface font-semibold text-ink-body outline-none transition focus:border-gold ${
              mobile ? "px-5 py-3.5 text-base" : "px-5 py-4 text-lg"
            }`}
          />
        </label>

        {error ? (
          <p id={errorId} className="text-sm font-semibold text-maroon-bright">
            {error}
          </p>
        ) : null}

        {successMessage ? (
          <div className="p-4 rounded-[1rem] bg-surface-soft border border-[#eedfe3] text-sm font-semibold text-maroon-bright leading-relaxed">
            {successMessage}
          </div>
        ) : null}

        <div className={`grid ${mobile ? "pt-1" : "gap-3 pt-1"}`}>
          <button
            disabled={isSubmitting}
            type="submit"
            className={`aksara-primary-button flex items-center justify-center gap-3 rounded-[1rem] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-70 ${
              mobile ? "px-5 py-3.5 text-base" : "px-5 py-4 text-lg"
            }`}
          >
            {isSubmitting
              ? isSignUp
                ? "Creating account..."
                : "Signing in..."
              : isSignUp
              ? "Register"
              : "Login"}
            <ArrowRight className="size-5" />
          </button>
        </div>
      </form>

      <div className="mt-5 text-center">
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError(null);
            setSuccessMessage(null);
          }}
          className="font-semibold text-maroon hover:text-maroon-deep transition text-sm"
        >
          {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
        </button>
      </div>

      {!mobile ? (
        <p className="mt-8 text-center text-sm leading-6 text-ink-soft">
          Protected academic environment. By signing in you agree to the
          <Link
            href="/acceptable-use-policy"
            className="font-semibold text-maroon-bright transition hover:text-maroon"
          >
            {" "}
            Acceptable Use Policy
          </Link>
          {" "}and{" "}
          <Link
            href="/privacy-notice"
            className="font-semibold text-maroon-bright transition hover:text-maroon"
          >
            Privacy Notice
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}

export default function Home() {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <main className="min-h-screen px-4 py-4 lg:px-8 lg:py-7">
      <div className="mx-auto hidden min-h-[calc(100vh-2rem)] max-w-[95rem] flex-col lg:flex">
        <header className="flex items-center justify-between text-[0.95rem] text-ink-soft">
          <BrandMark />
          <div className="flex items-center gap-8">
            <p className="aksara-mono text-[0.72rem] text-ink-soft">
              Sem 2 / 2025/26
            </p>
            <p>Need help?</p>
          </div>
        </header>

        <div className="mt-10 grid flex-1 grid-cols-[1.02fr_0.98fr] gap-14">
          <section className="flex flex-col justify-between pb-5">
            <div>
              <p className="aksara-mono text-[0.7rem] text-maroon-soft">
                Aksara / Academic Operating System
              </p>
              <h1 className="aksara-serif mt-8 max-w-[46rem] text-[6.8rem] leading-[0.87] tracking-[-0.03em] text-ink">
                A quiet place to
                <br />
                <span className="italic text-maroon-bright">think,</span>
                <br />
                plan, and
                <br />
                <span className="italic text-maroon-bright">finish.</span>
              </h1>
              <p className="mt-6 max-w-[37rem] text-[1.55rem] leading-10 text-ink-body">
                Your private academic command center. Assignments, tutorials,
                group sprints, and exam dates gathered into one calm surface.
              </p>
            </div>

            <div>
              <div className="mt-10 grid max-w-[43rem] grid-cols-3 gap-4">
                {loginHighlights.map((item) => (
                  <article key={item.label} className="aksara-soft-card p-6">
                    <p className="aksara-mono text-[0.56rem] text-gold">
                      {item.label}
                    </p>
                    <h2 className="aksara-serif mt-4 text-[2rem] leading-none text-ink">
                      {item.title}
                    </h2>
                    <p className="mt-3 text-[1.05rem] leading-7 text-ink-body">
                      {item.copy}
                    </p>
                  </article>
                ))}
              </div>

              <div className="mt-10 pr-10 text-ink-soft">
                <p className="text-sm font-medium tracking-[0.04em] text-ink-soft">
                  Copyright 2026 Jobayer Alam. All rights reserved.
                </p>
              </div>
            </div>
          </section>

          <section className="relative flex items-center justify-center px-8">
            <div className="aksara-stage absolute inset-x-6 inset-y-12" />
            <LoginForm isSignUp={isSignUp} setIsSignUp={setIsSignUp} />
          </section>
        </div>
      </div>

      <div className="mx-auto flex min-h-[100svh] max-w-[28rem] flex-col px-2 pt-2 lg:hidden">
        <header className="pt-5">
          <BrandMark />
        </header>

        <div className="mt-10">
          <p className="aksara-mono text-[0.7rem] text-maroon-soft">
            {isSignUp ? "Sign Up" : "Sign In"}
          </p>
          <h1 className="aksara-serif mt-4 text-[4.2rem] leading-[0.84] tracking-[-0.04em] text-ink">
            {isSignUp ? (
              <>
                Create
                <br />
                <span className="italic text-maroon-bright">account.</span>
              </>
            ) : (
              <>
                Welcome
                <br />
                <span className="italic text-maroon-bright">back.</span>
              </>
            )}
          </h1>
          <p className="mt-4 max-w-[15rem] text-[1.4rem] leading-8 text-ink-body">
            {isSignUp
              ? "Set up your private planner in seconds"
              : "Your assignments are waiting for you"}
          </p>
        </div>

        <div className="mt-8">
          <LoginForm mobile isSignUp={isSignUp} setIsSignUp={setIsSignUp} />
        </div>

        <footer className="mt-auto px-2 pb-8 pt-8 text-center">
          <p className="text-[0.88rem] font-medium tracking-[0.04em] text-ink-soft">
            Copyright 2026 Jobayer Alam. All rights reserved.
          </p>
        </footer>
      </div>
    </main>
  );
}
