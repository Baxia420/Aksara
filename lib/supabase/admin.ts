import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for trusted server-side jobs (e.g. the reminder
 * cron). Bypasses RLS — never expose this to the browser or import it into a
 * client component.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
