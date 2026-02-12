const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
        pathname: '/ipfs/**'
      },
      {
        protocol: 'https',
        hostname: 'ipfs.io',
        pathname: '/ipfs/**'
      },
      {
        protocol: 'https',
        hostname: '**.ipfs.dweb.link',
        pathname: '/**'
      }
    ]
  },
  webpack: (config) => {
    config.resolve.alias['@react-native-async-storage/async-storage'] = path.resolve(
      __dirname,
      'src/lib/shims/asyncStorage.ts'
    );
    return config;
  },
};

module.exports = nextConfig;
