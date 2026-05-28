import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type LoginRequestBody = {
  password: string;
  username: string; // Used as email
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<LoginRequestBody>;
    const email = (body.username ?? "").trim();
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required." },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { message: error.message },
        { status: 401 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { message: "Unable to process login." },
      { status: 500 },
    );
  }
}
