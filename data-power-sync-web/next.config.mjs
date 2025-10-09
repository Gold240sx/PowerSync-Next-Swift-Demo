/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
// @ts-check

/** @type {import("next").NextConfig} */
const config = {
  // Configure webpack to handle WASM files properly
  webpack: (config, { isServer }) => {
    // Add WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    
    // Handle WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });
    
    // Don't parse wa-sqlite WASM files as we want them loaded as files
    config.module.noParse = /wa-sqlite.*\.wasm$/;
    
    return config;
  },
  
  // Ensure static files are properly served
  async headers() {
    return [
      {
        source: '/:path*.wasm',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/wasm',
          },
        ],
      },
    ];
  },
};

export default config;