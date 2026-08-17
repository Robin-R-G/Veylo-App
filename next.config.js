const isGithubActions = process.env.GITHUB_ACTIONS || false;
const isProd = process.env.NODE_ENV === 'production';
const isStaticExport = process.env.DEPLOY_TARGET === 'ghpages';
const repo = isGithubActions || isProd ? '/Veylo-App' : '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isStaticExport && { output: 'export' }),
  basePath: repo || undefined,
  assetPrefix: repo || undefined,
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    unoptimized: !!isStaticExport,
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
