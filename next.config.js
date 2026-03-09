/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [320, 420, 640, 750, 828, 1080, 1200, 1600, 1920, 2560, 3200, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
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
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = { ...(config.resolve.alias || {}), "@react-native-async-storage/async-storage": false };
    }
    return config;
  },
};
module.exports = nextConfig;
