import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      console.log("=== MIDDLEWARE AUTHORIZED CHECK ===");
      console.log("Token exists:", !!token);
      console.log("Token error:", token?.error);
      console.log("Token expires at:", token?.expiresAt);
      console.log("Current time:", Date.now());
      console.log("Request URL:", req.nextUrl.pathname);
      console.log("Request search params:", req.nextUrl.searchParams.toString());
      
      // Allow videochat access for solo mode (mode=solo query param)
      if (req.nextUrl.pathname.startsWith('/videochat')) {
        const isSoloMode = req.nextUrl.searchParams.get('mode') === 'solo';
        if (isSoloMode) {
          console.log("Solo mode detected, allowing access without auth");
          return true;
        }
      }
      
      // If token has a refresh error, deny access (will redirect to login)
      if (token?.error === 'RefreshAccessTokenError') {
        console.log("Token has refresh error, denying access");
        return false;
      }

      // Allow access if token exists (refresh already handled in jwt callback)
      const hasValidToken = !!token && !token.error;
      console.log("Returning:", hasValidToken);
      return hasValidToken;
    },
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/communication/:path*",
    "/review/:path*",
    "/account/:path*", // Protect the account page
    "/videochat/:path*", // Protect the video chat page
  ],
};

