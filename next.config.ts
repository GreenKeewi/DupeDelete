import type { NextConfig } from "next";
import CopyWebpackPlugin from "copy-webpack-plugin"; // Import CopyWebpackPlugin

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (process.env.NODE_ENV === "development") {
      config.module.rules.push({
        test: /\.(jsx|tsx)$/,
        exclude: /node_modules/,
        enforce: "pre",
        use: "@dyad-sh/nextjs-webpack-component-tagger",
      });
    }

    // Copy the webp.wasm file to the build output for server-side usage
    if (isServer) {
      config.plugins.push(
        new CopyWebpackPlugin({
          patterns: [
            {
              from: "public/webp.wasm", // Source path
              to: "app/api/upload/webp.wasm", // Destination path inside .next/server
            },
          ],
        })
      );
    }
    return config;
  },
};

export default nextConfig;