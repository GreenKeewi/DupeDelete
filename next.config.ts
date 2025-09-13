import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    if (process.env.NODE_ENV === "development") {
      config.module.rules.push({
        test: /\.(jsx|tsx)$/,
        exclude: /node_modules/,
        enforce: "pre",
        use: "@dyad-sh/nextjs-webpack-component-tagger",
      });
    }
    return config;
  },
  experimental: {
    // Increase the timeout for API routes
    serverComponentsExternalPackages: ["image-hash", "jimp", "unzipper"],
  },
  // Increase the body size limit for file uploads
  serverRuntimeConfig: {
    maxFileSize: 1024 * 1024 * 1024, // 1GB
  },
};

export default nextConfig;
