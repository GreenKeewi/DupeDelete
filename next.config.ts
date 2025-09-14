import type { NextConfig } from "next";
import CopyWebpackPlugin from 'copy-webpack-plugin';
import path from 'path';

const nextConfig: NextConfig = {
  webpack: (config, { isServer, webpack }) => {
    // Existing rule for component tagger in development
    if (process.env.NODE_ENV === "development") {
      config.module.rules.push({
        test: /\.(jsx|tsx)$/,
        exclude: /node_modules/,
        enforce: "pre",
        use: "@dyad-sh/nextjs-webpack-component-tagger",
      });
    }

    // Remove the previous .wasm rule to avoid conflicts with CopyWebpackPlugin
    config.module.rules = config.module.rules.filter(
      (rule: any) => !(rule.test && rule.test.toString().includes('wasm'))
    );

    if (isServer) {
      config.plugins.push(
        new CopyWebpackPlugin({
          patterns: [
            {
              from: path.join(__dirname, 'node_modules/jimp/dist/webp.wasm'),
              to: path.join(config.output.path, 'app/api/upload/webp.wasm'),
            },
            // Removed jimp-worker.wasm copy pattern as it was causing an error
          ],
        })
      );
    }

    return config;
  },
};

export default nextConfig;