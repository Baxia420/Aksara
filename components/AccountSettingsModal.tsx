"use client";

import { useState, useEffect } from "react";
import { updateProfile } from "@/app/actions";

export function AccountSettingsModal({
  isOpen,
  onClose,
  userProfile,
}: {
  isOpen: boolean;
  onClose: () => void;
  userProfile: { firstName?: string; lastName?: string; email?: string } | null;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && userProfile) {
      setFirstName(userProfile.firstName || "");
      setLastName(userProfile.lastName || "");
      setPassword("");
      setSuccess(false);
      setError(null);
    }
  }, [isOpen, userProfile]);

  if (!isOpen) return null;

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      await updateProfile(formData);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2a1820]/50 p-4 backdrop-blur-sm">
      <div className="aksara-card w-full max-w-md p-8">
        <h2 className="aksara-serif text-3xl font-semibold mb-6 text-[#26171e]">
          Account Settings
        </h2>
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1 text-[#8f7881]">Email (Read-only)</label>
            <input
              disabled
              value={userProfile?.email || ""}
              className="w-full border border-[#ecd9de] rounded-[0.85rem] px-4 py-3 bg-[#fdfaf7] text-[#9a848d] cursor-not-allowed"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-[#8f7881]">First Name</label>
              <input
                required
                name="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jobayer"
                className="w-full border border-[#ecd9de] rounded-[0.85rem] px-4 py-3 outline-none focus:border-[#a31657]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-[#8f7881]">Last Name</label>
              <input
                required
                name="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Alam"
                className="w-full border border-[#ecd9de] rounded-[0.85rem] px-4 py-3 outline-none focus:border-[#a31657]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-[#8f7881]">New Password (Optional)</label>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters to change"
              className="w-full border border-[#ecd9de] rounded-[0.85rem] px-4 py-3 outline-none focus:border-[#a31657]"
            />
          </div>

          {error && (
            <p className="text-sm font-semibold text-[#a31657]">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm font-semibold text-emerald-700">
              Profile updated successfully!
            </p>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 font-semibold text-[#8f7881] hover:text-[#26171e] transition rounded-[0.85rem]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="aksara-primary-button px-6 py-3 font-semibold text-white rounded-[0.85rem] disabled:opacity-70"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
