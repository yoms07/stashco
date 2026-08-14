import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@stellar-ambassador/shared'],
  reactStrictMode: true,
};

export default nextConfig;
