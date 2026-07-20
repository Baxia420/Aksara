"use client";

import { useState } from "react";
import type { UserProfile } from "@/lib/types";

export function getInitials(profile: UserProfile | null) {
  if (!profile) return "•";
  if (profile.firstName && profile.lastName) {
    return `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();
  }
  if (profile.firstName) {
    return profile.firstName.substring(0, 2).toUpperCase();
  }
  if (profile.name) {
    const parts = profile.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }
  if (profile.email) {
    return profile.email.charAt(0).toUpperCase();
  }
  return "•";
}

/** Avatar button with the signed-in dropdown (Settings / Log Out). The mobile
 *  and desktop headers share the identical menu; only the trigger styling and
 *  menu width differ. */
export function ProfileMenu({
  userProfile,
  onOpenSettings,
  onLogout,
  variant = "desktop",
}: {
  userProfile: UserProfile | null;
  onOpenSettings: () => void;
  onLogout: () => void;
  variant?: "desktop" | "mobile";
}) {
  const [isOpen, setIsOpen] = useState(false);

  const triggerClass =
    variant === "mobile"
      ? "flex size-12 cursor-pointer items-center justify-center rounded-full bg-gold text-sm font-bold text-[#7b173d] shadow-[0_10px_24px_rgba(226,162,47,0.28)] hover:brightness-105 active:scale-95 transition"
      : "flex size-14 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-sm font-bold text-maroon-bright shadow-[0_10px_24px_rgba(131,16,62,0.07)] hover:border-maroon-bright transition";

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={triggerClass}
      >
        {getInitials(userProfile)}
      </button>
      {isOpen && (
        <div
          className={`absolute right-0 mt-2 ${
            variant === "mobile" ? "w-52" : "w-56"
          } rounded-2xl border border-[rgba(155,112,122,0.2)] bg-surface p-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150`}
        >
          <div className="px-4 py-2 text-xs font-semibold text-ink-soft border-b border-line mb-1 text-left">
            Signed in as <br />
            <span className="text-ink break-all">{userProfile?.email}</span>
          </div>
          <button
            onClick={() => {
              setIsOpen(false);
              onOpenSettings();
            }}
            className="w-full text-left px-4 py-2.5 text-sm font-semibold text-ink-muted hover:bg-maroon/5 hover:text-maroon rounded-xl transition"
          >
            Settings
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            className="w-full text-left px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 rounded-xl transition"
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}
