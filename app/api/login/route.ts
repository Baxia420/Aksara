import { NextResponse } from "next/server";

const LOGIN_USERNAME = process.env.AKSARA_LOGIN_USERNAME;
const LOGIN_PASSWORD = process.env.AKSARA_LOGIN_PASSWORD;
const SESSION_COOKIE = "aksara_session";
const SESSION_VALUE = "boleh";

type LoginRequestBody = {
  password: string;
  username: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<LoginRequestBody>;
    const username = (body.username ?? "").trim();
    const password = body.password ?? "";

    if (!LOGIN_USERNAME || !LOGIN_PASSWORD) {
      return NextResponse.json(
        { message: "Login is not configured yet." },
        { status: 500 },
      );
    }

    if (username !== LOGIN_USERNAME || password !== LOGIN_PASSWORD) {
      return NextResponse.json(
        { message: "Invalid username or password." },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
      name: SESSION_COOKIE,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      value: SESSION_VALUE,
    });

    return response;
  } catch {
    return NextResponse.json(
      { message: "Unable to process login." },
      { status: 400 },
    );
  }
}
