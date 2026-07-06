import "server-only";

// The account that owns shared/public courses and tasks. Prefer the env var
// (set it in Vercel to keep config in one place); fall back to the known admin
// address so production still recognizes the admin if the env var is missing.
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "alam.j@graduate.utm.my";

// Case-insensitive so a differently-cased session email can't lock the admin out.
export function isAdmin(email: string | undefined | null): boolean {
  return !!email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
