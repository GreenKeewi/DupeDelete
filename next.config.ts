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
        filename: "static/[hash][ext]", // Output to static folder
      },
    });

    // If you're building for the server, you might need to ensure
    // that 'fs' and 'path' are not bundled by webpack, as they are Node.js built-ins.
    // This is often handled by Next.js automatically, but can be a source of issues.
    // For now, we'll rely on Next.js's default handling.

    return config;
  },
};

export default nextConfig;