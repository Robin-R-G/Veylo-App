const isGithubActions = process.env.GITHUB_ACTIONS || false;
const isProd = process.env.NODE_ENV === 'production';
const repo = isGithubActions || isProd ? '/Veylo-App' : '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: repo || undefined,
  assetPrefix: repo || undefined,
  trailingSlash: true,
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

module.exports = nextConfig;
