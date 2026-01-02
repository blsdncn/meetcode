/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Handle Monaco Editor workers
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
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
