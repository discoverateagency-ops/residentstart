import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // runtime prompts + agent knowledge are read from disk by API routes
  outputFileTracingIncludes: {
    "/**": ["./prompts/**/*", "./data/**/*"],
  },
  serverExternalPackages: ["near-api-js"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
