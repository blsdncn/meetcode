import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  // Decrypt the token using the same secret used in `authOptions`
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // If no token exists, redirect to the login page
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check if token has an error (like refresh failure)
  if (token.error) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If the token exists, allow the request to proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/matchmaking/:path*",
    "/communication/:path*",
    "/review/:path*",
    "/account/:path*", // Protect the account page
    "/videochat/:path*", // Protect the video chat page
  ],
};

