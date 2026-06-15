import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ✅ FIX: Prevents firebase-admin ESM conflict (ERR_REQUIRE_ESM jose/jwks-rsa)
  serverExternalPackages: ['firebase-admin'],
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
