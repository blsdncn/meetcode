// API URL for server-side requests (direct to backend container)
// Used by NextAuth callbacks which run server-side and need direct access to backend
export const BACKEND_API_URL: string = process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/` : "/api/";
