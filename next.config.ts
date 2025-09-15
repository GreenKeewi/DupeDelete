import CopyWebpackPlugin from "copy-webpack-plugin";
import type { NextConfig } from "next";

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
    // Some libraries (e.g., image-hash via @cwasm/webp) resolve the wasm from a vendor chunk dir in dev:
    //   .next/server/vendor-chunks/webp.wasm
    // We copy to both vendor-chunks/ and the previous app/api/upload/ path to satisfy different loaders.
    if (isServer) {
      config.plugins = config.plugins || [];
      const webpWasmPath = (() => {
        try {
          // Resolve path robustly so it works in different environments
          return require.resolve("@cwasm/webp/webp.wasm");
        } catch {
          return null;
        }
      })();

      if (webpWasmPath) {
        config.plugins.push(
          new CopyWebpackPlugin({
            patterns: [
              {
                from: webpWasmPath,
                to: "app/api/upload/webp.wasm",
                noErrorOnMissing: true,
              },
              {
                from: webpWasmPath,
                to: "vendor-chunks/webp.wasm",
                noErrorOnMissing: true,
              },
            ],
          })
        );
      }
    }
    return config;
  },
};

export default nextConfig;
