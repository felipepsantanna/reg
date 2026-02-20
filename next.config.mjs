/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 1. Mova 'cheerio' para a raiz (fora de experimental)
  serverExternalPackages: ['cheerio'],

  // 2. Mantenha as configurações de imagens para os seus CDNs (Essencial para não dar erro 400)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn4.capitalsexy.com.br' },
      { protocol: 'https', hostname: 'capitalsexy.b-cdn.net' },
    ],
  },

  experimental: {
    // 3. serverActions agora aceita o limite de corpo diretamente aqui
    serverActions: {
      bodySizeLimit: '30mb',
    },
  }

  // Nota: 'swcMinify' foi removido pois agora é o padrão obrigatório do Next.js
};

export default nextConfig;