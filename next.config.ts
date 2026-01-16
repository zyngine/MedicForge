import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Redirect non-www to www to ensure consistent domain for auth cookies
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "medicforge.net",
          },
        ],
        destination: "https://www.medicforge.net/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
