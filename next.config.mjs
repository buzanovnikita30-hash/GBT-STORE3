/** @type {import('next').NextConfig} */
const nextConfig = {
  // Разрешаем локальные dev-origin'ы, чтобы статика /_next не ломалась
  // при открытии сайта через localhost и 127.0.0.1.
  allowedDevOrigins: ["http://127.0.0.1:3000", "http://localhost:3000"],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack(config, { dev }) {
    // Fix unstable local dev cache on Windows that causes
    // "Cannot find module './xxxx.js'" from .next/server/webpack-runtime.js
    if (dev) {
      config.cache = false;
    }
    return config;
  },
  async redirects() {
    return [
      { source: "/order", destination: "/checkout", permanent: true },
      { source: "/chatgpt", destination: "/", permanent: true },
      { source: "/pricing", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
