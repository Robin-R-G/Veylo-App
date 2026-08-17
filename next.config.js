const isGithubActions = process.env.GITHUB_ACTIONS || false;
const isProd = process.env.NODE_ENV === 'production';
const repo = isGithubActions || isProd ? '/Veylo-App' : '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: repo || undefined,
  assetPrefix: repo || undefined,
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
  },
};

module.exports = nextConfig;
