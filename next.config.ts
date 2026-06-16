import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['firebase-admin', 'jwks-rsa', 'jose'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/dgqukbs8n/**',
      },
    ],
  },
};

export default nextConfig;
