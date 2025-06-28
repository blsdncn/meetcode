// API URL for client-side requests (goes through reverse proxy)
export const API_HOST_BASE_URL: string = "/api/";

// API URL for server-side requests (direct to backend container)
export const BACKEND_API_URL: string = process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/` : "/api/";
