import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'imdyyahjqntkcjdliywt.supabase.co', // Tu dominio de Supabase
      },
    ],
  },
};

// Restart dev server to reload Prisma Client schema changes
export default nextConfig;