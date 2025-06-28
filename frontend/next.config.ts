/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // Removed rewrites since we're using Nginx for routing
  // async rewrites() {
  //   return [
  //     {
  //       source : "/api/:path*",
  //       destination: "http://backend:8000/api/:path*"
  //     },
  //     {
  //       source: "/ws/:path*",
  //       destination: "http://backend:8000/ws/:path*",
  //     },
  //   ];
  // },
};

export default nextConfig;
