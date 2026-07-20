"use client";

import type { UserProfile } from "@/lib/types";
import { ProfileMenu } from "@/components/dashboard/ProfileMenu";

export function MobileTopBar({
  meta,
  title,
  accent,
  userProfile = null,
  onOpenSettings = () => {},
  onLogout = () => {},
}: {
  accent?: string;
  meta: string;
  title: string;
  userProfile?: UserProfile | null;
  onOpenSettings?: () => void;
  onLogout?: () => void;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="aksara-mono text-[0.6rem] text-maroon-soft">{meta}</p>
          <h1 className="aksara-serif mt-2 text-[3.45rem] leading-[0.82] tracking-[-0.04em] text-ink">
            {title}
            {accent ? (
              <>
                <br />
                <span className="italic text-maroon-soft">{accent}</span>
              </>
            ) : null}
          </h1>
        </div>
        <div className="flex items-center gap-3 pt-3">
          <ProfileMenu
            userProfile={userProfile}
            onOpenSettings={onOpenSettings}
            onLogout={onLogout}
            variant="mobile"
          />
        </div>
      </div>
    </div>
  );
}
