import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["unpdf"],
  transpilePackages: ["react-markdown", "remark-gfm"],
};

export default nextConfig;
