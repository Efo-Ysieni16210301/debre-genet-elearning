import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: false,
  outputFileTracingIncludes: {
    "/**/*": ["./src/generated/prisma/**/*"],
  },
};

export default nextConfig;
