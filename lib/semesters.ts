import "server-only";
import type { createClient } from "@/lib/supabase/server";

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** The user's active semester id, or null when none exists — including before
 *  the semesters migration has run (the query fails soft). */
export async function getActiveSemesterId(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("semesters")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return data[0].id as string;
}
