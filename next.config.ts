import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No backend/server — all data access is the Firebase client SDK
  // talking directly to Realtime Database/Auth from the browser (see
  // lib/firebase.ts). A static export means Netlify just serves plain
  // files, with no Next.js server runtime or Netlify Function involved.
  output: "export",
  // next/image's optimizer needs a server; unoptimized falls back to
  // plain <img> rendering, which works fine for a static export.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
