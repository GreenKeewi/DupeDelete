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

    // Remove any previous .wasm rules or copy-webpack-plugin configurations
    config.module.rules = config.module.rules.filter(
      (rule: any) => !(rule.test && rule.test.toString().includes('wasm'))
    );
    // Also remove CopyWebpackPlugin if it was added
    config.plugins = config.plugins.filter(
      (plugin: any) => plugin.constructor.name !== 'CopyWebpackPlugin'
    );

    // Add a standard rule to handle .wasm files as assets
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });

    return config;
  },
};

export default nextConfig;