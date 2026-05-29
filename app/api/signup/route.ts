import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SignUpRequestBody = {
  password?: string;
  username?: string; // used as email
  fullName?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SignUpRequestBody;
    const email = (body.username ?? "").trim();
    const password = body.password ?? "";
    const fullName = (body.fullName ?? "").trim();

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { message: "Full Name, email, and password are required." },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Sign up with Supabase Auth and pass the Full Name in user_metadata
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        // Redirect URL back to the site for email verification
        emailRedirectTo: `${new URL(request.url).origin}/auth/callback`,
      },
    });

    if (error) {
      return NextResponse.json(
        { message: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to process signup.";
    return NextResponse.json(
      { message },
      { status: 500 },
    );
  }
}
