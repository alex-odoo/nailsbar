import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['192.168.1.134'],
  // Every <Image> serves a file from /public. No remote hosts on purpose: the optimizer then never
  // fetches an outside image, which is how the image-optimizer advisories of 2026 reach a server.
  images: {},
};

export default nextConfig;
