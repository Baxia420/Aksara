import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "aksara_session";
const SESSION_VALUE = "boleh";

export function proxy(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value;

  if (session !== SESSION_VALUE) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/dashboard/:path*",
};
