import type { NextConfig } from "next";
import CopyWebpackPlugin from "copy-webpack-plugin";

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

    // Ensure the WebP WASM used by dependencies is available at runtime in the server build.
    // The error path expects the file at .next/server/app/api/upload/webp.wasm
    if (isServer) {
      config.plugins = config.plugins || [];
      config.plugins.push(
        new CopyWebpackPlugin({
          patterns: [
            {
              from: "node_modules/@cwasm/webp/webp.wasm",
              to: "app/api/upload/webp.wasm",
            },
          ],
        })
      );
    }
    return config;
  },
};

export default nextConfig;
