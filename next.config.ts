import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  turbopack: { root: __dirname },
  webpack: (config, { dir }) => {
    // Ensure webpack resolves modules from the project directory, not parent directories
    config.resolve.modules = [
      path.join(__dirname, 'node_modules'),
      'node_modules',
    ];
    return config;
  },
};

export default nextConfig;
