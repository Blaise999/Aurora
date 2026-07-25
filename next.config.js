/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,

  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@tanstack/react-query",
      "recharts",
      "framer-motion",
    ],
  },

  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 1080, 1200, 1920],
    imageSizes: [32, 64, 128, 256, 384],
    minimumCacheTTL: 3600,

    remotePatterns: [
      // Alchemy / marketplace / NFT infra
      { protocol: "https", hostname: "nft-cdn.alchemy.com", pathname: "/**" },
      { protocol: "https", hostname: "nft2-cdn.alchemy.com", pathname: "/**" },
      { protocol: "https", hostname: "cdn.center.app", pathname: "/**" },
      { protocol: "https", hostname: "metadata.ens.domains", pathname: "/**" },
      { protocol: "https", hostname: "www.miladymaker.net", pathname: "/**" },

      // OpenSea / SeaDN
      { protocol: "https", hostname: "i.seadn.io", pathname: "/**" },
      { protocol: "https", hostname: "i2.seadn.io", pathname: "/**" },
      { protocol: "https", hostname: "i2c.seadn.io", pathname: "/**" },
      { protocol: "https", hostname: "**.seadn.io", pathname: "/**" },
      { protocol: "https", hostname: "openseauserdata.com", pathname: "/**" },

      // IPFS common gateways
      { protocol: "https", hostname: "ipfs.io", pathname: "/**" },
      { protocol: "https", hostname: "gateway.pinata.cloud", pathname: "/**" },
      { protocol: "https", hostname: "**.mypinata.cloud", pathname: "/**" },
      { protocol: "https", hostname: "cloudflare-ipfs.com", pathname: "/**" },
      { protocol: "https", hostname: "nftstorage.link", pathname: "/**" },
      { protocol: "https", hostname: "w3s.link", pathname: "/**" },
      { protocol: "https", hostname: "**.ipfs.w3s.link", pathname: "/**" },
      { protocol: "https", hostname: "**.ipfs.dweb.link", pathname: "/**" },
      { protocol: "https", hostname: "**.ipfs.nftstorage.link", pathname: "/**" },
      { protocol: "https", hostname: "dweb.link", pathname: "/**" },
      { protocol: "https", hostname: "cf-ipfs.com", pathname: "/**" },
      { protocol: "https", hostname: "4everland.io", pathname: "/**" },
      { protocol: "https", hostname: "**.4everland.link", pathname: "/**" },

      // Arweave
      { protocol: "https", hostname: "arweave.net", pathname: "/**" },
      { protocol: "https", hostname: "**.arweave.net", pathname: "/**" },

      // Cloud / storage / media
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "pbs.twimg.com", pathname: "/**" },
      { protocol: "https", hostname: "storage.googleapis.com", pathname: "/**" },
      { protocol: "https", hostname: "**.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "**.amazonaws.com", pathname: "/**" },
      { protocol: "https", hostname: "**.s3.amazonaws.com", pathname: "/**" },
      { protocol: "https", hostname: "**.cdninstagram.com", pathname: "/**" },

      // App-hosted or other remote media fallbacks
      { protocol: "https", hostname: "**.vercel.app", pathname: "/**" },
      { protocol: "https", hostname: "**.supabase.co", pathname: "/**" },
      { protocol: "https", hostname: "**.supabase.in", pathname: "/**" },
      { protocol: "https", hostname: "**.railway.app", pathname: "/**" },
      { protocol: "https", hostname: "**.render.com", pathname: "/**" },
      { protocol: "https", hostname: "**.imgix.net", pathname: "/**" },
      { protocol: "https", hostname: "**.cloudfront.net", pathname: "/**" },
    ],
  },

  async headers() {
    return [
      {
        source: "/pictures/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/api/settings",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=120, stale-while-revalidate=600",
          },
        ],
      },
    ];
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        "@react-native-async-storage/async-storage": false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
