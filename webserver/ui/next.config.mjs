/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: emit pure HTML/CSS/JS into distDir, no Node runtime needed.
  // Required for serving from LittleFS on the ESP.
  output: 'export',

  // Build output goes straight into ../webroot so PlatformIO's uploadfs target
  // packs it into the LittleFS image without an extra copy step. Mirrors the
  // legacy web-interface/ Vite config's outDir.
  distDir: '../webroot',

  // Export each route as a folder/index.html instead of route.html. Lets the
  // ESP static-files handler resolve "/settings/" to "settings/index.html"
  // without the C++ side having to special-case extensions.
  trailingSlash: true,

  typescript: {
    ignoreBuildErrors: true,
  },

  // LittleFS can't do dynamic image processing, so Next must skip its image
  // optimizer and ship the source images as-is.
  images: {
    unoptimized: true,
  },

  // Dev-only: forward /api to the real ESP. WebSockets ARE NOT proxied here
  // — Next dev has no equivalent of Vite's `ws: true`. The WS client should
  // point directly at the ESP IP during `next dev`. Update the IP when the
  // ESP moves networks (matches the legacy vite.config.ts hardcoded host).
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://192.168.2.6/api/:path*' },
    ];
  },
};

export default nextConfig;
