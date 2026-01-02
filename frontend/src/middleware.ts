import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => {
      console.log("=== MIDDLEWARE AUTHORIZED CHECK ===");
      console.log("Token exists:", !!token);
      console.log("Token error:", token?.error);
      console.log("Token expires at:", token?.expiresAt);
      console.log("Current time:", Date.now());
      
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
    "/matchmaking/:path*",
    "/communication/:path*",
    "/review/:path*",
    "/account/:path*", // Protect the account page
    "/videochat/:path*", // Protect the video chat page
  ],
};

