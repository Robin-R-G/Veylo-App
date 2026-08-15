/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || (isProd ? '/Veylo-App' : ''),
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || (isProd ? '/Veylo-App' : ''),
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
};

module.exports = nextConfig;
