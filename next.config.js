/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  // ── poweredByHeader off for slightly smaller responses ──
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "@tanstack/react-query", "recharts", "framer-motion"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // Trimmed device sizes — fewer variants = faster cache hits
    deviceSizes: [640, 750, 1080, 1200, 1920],
    imageSizes: [32, 64, 128, 256, 384],
    // Cache remote images for 1 hour minimum
    minimumCacheTTL: 3600,
    remotePatterns: [
      { protocol: "https", hostname: "nft-cdn.alchemy.com", pathname: "/**" },
      { protocol: "https", hostname: "ipfs.io", pathname: "/**" },
      { protocol: "https", hostname: "gateway.pinata.cloud", pathname: "/**" },
      { protocol: "https", hostname: "cloudflare-ipfs.com", pathname: "/**" },
      { protocol: "https", hostname: "nftstorage.link", pathname: "/**" },
      { protocol: "https", hostname: "arweave.net", pathname: "/**" },
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      { protocol: "https", hostname: "i.seadn.io", pathname: "/**" },
      { protocol: "https", hostname: "openseauserdata.com", pathname: "/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "**.ipfs.dweb.link", pathname: "/**" },
      { protocol: "https", hostname: "**.ipfs.w3s.link", pathname: "/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/pictures/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // Let /api/nft/cached control its own caching (shuffle = no-store)
      {
        source: "/api/settings",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=120, stale-while-revalidate=600" },
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
