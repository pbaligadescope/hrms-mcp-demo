import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // OAuth Protected Resource Metadata for the MCP server (used in Stage 3).
      { source: "/.well-known/oauth-protected-resource", destination: "/api/oauth-protected-resource" },
      { source: "/.well-known/oauth-protected-resource/:path*", destination: "/api/oauth-protected-resource" },
    ];
  },
};

export default nextConfig;
