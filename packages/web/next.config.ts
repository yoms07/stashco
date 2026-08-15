import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@stashco/shared'],
  reactStrictMode: true,
};

export default nextConfig;
