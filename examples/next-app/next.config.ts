import { withTailcloak } from "@tailcloak/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withTailcloak(nextConfig);
