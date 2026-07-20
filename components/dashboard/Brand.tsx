import Link from "next/link";
import { GraduationCap } from "lucide-react";

export function BrandGlyph({ size = "default" }: { size?: "default" | "small" }) {
  const classes =
    size === "small"
      ? "size-11 rounded-[1.1rem]"
      : "size-14 rounded-[1.15rem]";

  return (
    <div
      className={`${classes} flex items-center justify-center bg-brand text-gold shadow-[0_12px_28px_rgba(131,16,62,0.18)]`}
    >
      <GraduationCap className={size === "small" ? "size-5" : "size-6"} />
    </div>
  );
}

export function BrandLockup() {
  return (
    <Link href="/" className="flex items-center gap-4">
      <BrandGlyph />
      <div>
        <p className="aksara-serif text-[2rem] font-semibold leading-none text-maroon">
          Aksara
        </p>
        <p className="aksara-mono mt-1 text-[0.58rem] text-maroon-soft">
          Academic OS
        </p>
      </div>
    </Link>
  );
}
