/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.tiktokcdn.com' },
      { protocol: 'https', hostname: '*.tiktokcdn-eu.com' },
      { protocol: 'https', hostname: '*.tiktokv.eu' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;