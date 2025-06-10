/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverComponentsExternalPackages: ['cheerio'],
    serverActions: {
      bodySizeLimit: '30mb', // Example limit
    },
  }
};

export default nextConfig;
