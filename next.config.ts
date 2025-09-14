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
              // Updated path for webp.wasm, typically found in @jimp/plugin-webp
              from: path.join(__dirname, 'node_modules/@jimp/plugin-webp/dist/webp.wasm'),
              to: path.join(config.output.path, 'app/api/upload/webp.wasm'),
            },
            {
              // Updated path for jimp-worker.wasm, typically found in @jimp/core
              from: path.join(__dirname, 'node_modules/@jimp/core/dist/jimp-worker.wasm'),
              to: path.join(config.output.path, 'app/api/upload/jimp-worker.wasm'),
            },
          ],
        })
      );
    }

    return config;
  },
};

export default nextConfig;