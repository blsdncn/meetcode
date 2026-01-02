import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import axios, { AxiosError } from 'axios';
import { BACKEND_API_URL } from '@/lib/constants';
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";

declare module 'next-auth' {
  interface User {
    id?: string;
    accessToken?: string;
    refreshToken?: string;
  }

  interface Session {
    accessToken?: string;
    refreshToken?: string;
    error?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    error?: string;
  }
}

// Helper function for token refresh - extracted for clarity
// Uses direct axios instead of api client to avoid baseURL conflicts in server-side context
async function refreshAccessToken(token: any) {
  try {
    console.log("Attempting token refresh for:", token.sub);
    const response = await axios.post(`${BACKEND_API_URL}user-auth/refresh`, {
      refresh_token: token.refreshToken,
    });

    const { access_token } = response.data;

    const refreshedToken = {
      ...token,
      accessToken: access_token,
      expiresAt: getTokenExpiration(access_token), // Extract expiration from new token
    };
    
    console.log("Token refreshed successfully");
    return refreshedToken;
  } catch (error) {
    console.error('Token refresh error:', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

function getTokenExpiration(token: string): number {
  try {
    const decoded = JSON.parse(atob(token.split('.')[1]));
    return decoded.exp * 1000; // Convert to milliseconds
  } catch (error) {
    console.error('Error decoding token:', error);
    return Date.now() + 15 * 60 * 1000; // Fallback: 15 minutes from now
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.username || !credentials?.password) {
            throw new Error("Missing username or password");
          }

          const data = new URLSearchParams();
          data.append("username", credentials.username);
          data.append("password", credentials.password);

          const response = await axios.post(`${BACKEND_API_URL}user-auth/token`, data, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          });

          const { access_token, refresh_token } = response.data;

          if (access_token && refresh_token) {
            return {
              id: credentials.username,
              accessToken: access_token,
              refreshToken: refresh_token,
            };
          }

          return null;
        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
      },
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Allow redirects to routes within the same domain
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      // Allow redirects to the same origin
      if (url.startsWith(baseUrl)) {
        return url;
      }
      // Default to base URL for external redirects
      return baseUrl;
    },
    async signIn({ user, account }) {
      if (account?.provider === 'google' || account?.provider === 'github') {
        try {
          const res = await axios.post(`${BACKEND_API_URL}user-auth/oauth-register`, {
            email: user.email,
            username: user.name ?? user.email?.split("@")[0],
            provider: account.provider,
            access_token: account.access_token,
          });

          if (
            res.data?.msg === "User already exists" ||
            res.data?.msg === "OAuth user created"
          ) {
            return true;
          }

          return false;
        } catch (err) {
            const error = err as AxiosError;
          
            const data = error.response?.data as { msg?: string };
          
            if (data?.msg === "User already exists") {
              return true;
            }
          
            console.error("OAuth user registration failed:", {
              message: error.message,
              status: error.response?.status,
              data: error.response?.data,
            });  
            return false;
          }          
      }
      return true;
    },

    async jwt({ token, user, account }) {
      console.log("=== JWT CALLBACK DEBUG ===");
      console.log("Has user:", !!user);
      console.log("Account type:", account?.type);
      
      // Initial sign in with credentials
      if (user && account?.type === "credentials") {
        console.log("Initial credentials sign-in, setting up token");
        const initialToken = {
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          expiresAt: user.accessToken ? getTokenExpiration(user.accessToken): Date.now() + 15 * 60 * 1000,
          sub: user.id,
        };
        console.log("Initial token created:", initialToken);
        return initialToken;
      }

      // For OAuth providers (GitHub, Google), return token as-is
      if (account?.type === "oauth") {
        console.log("OAuth account, returning token as-is");
        return token;
      }

      // For subsequent requests, check if token needs refresh
      if (token.accessToken) {
        // Add a 60-second buffer to proactively refresh before expiry
        const refreshBuffer = 60 * 1000;
        if (token.expiresAt && Date.now() < (token.expiresAt - refreshBuffer)) {
          console.log("Token still valid, no refresh needed");
          return token;
        }

        // Token expired or close to expiry, attempt refresh
        if (token.refreshToken) {
          console.log("Token near expiry, attempting refresh");
          return await refreshAccessToken(token);
        } else {
          console.log("No refresh token available");
          return { ...token, error: 'NoRefreshToken' };
        }
      }

      console.log("Returning token unchanged:", token);
      return token;
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.error = token.error;
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      try {
        if (token?.refreshToken) {
          await axios.post(`${BACKEND_API_URL}user-auth/logout`, {
            refresh_token: token.refreshToken,
          });
          console.log('Tokens revoked successfully');
        }
      } catch (error) {
        console.error('Token revocation failed:', error);
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  },
};

export default NextAuth(authOptions);
