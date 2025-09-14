import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Existing rule for component tagger in development
    if (process.env.NODE_ENV === "development") {
      config.module.rules.push({
        test: /\.(jsx|tsx)$/,
        exclude: /node_modules/,
        enforce: "pre",
        use: "@dyad-sh/nextjs-webpack-component-tagger",
      });
    }

    // Add a rule to handle .wasm files
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
      generator: {
        // For server builds, place webp.wasm directly in the api/upload directory
        // This is a specific workaround for jimp/image-hash's loading mechanism
        filename: isServer ? "app/api/upload/[name][ext]" : "static/[hash][ext]",
      },
    });

    return config;
  },
};

export default nextConfig;