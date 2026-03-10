import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import {
  injected,
  walletConnect,
  coinbaseWallet,
  safe,
  metaMask,
} from "wagmi/connectors";

const wcProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;

if (!wcProjectId) {
  throw new Error("Missing NEXT_PUBLIC_WC_PROJECT_ID");
}

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  ssr: true,
  connectors: [
    injected({ shimDisconnect: true }),
    walletConnect({
      projectId: wcProjectId,
      showQrModal: true,
      metadata: {
        name: "AuroraNft",
        description: "Discover & Mint Digital Art on Base",
        url: "https://aurora-nft.vercel.app",
        icons: ["https://aurora-nft.vercel.app/pictures/logo.png"],
      },
    }),
    metaMask(),
    coinbaseWallet({
      appName: "AuroraNft",
      appLogoUrl: "https://aurora-nft.vercel.app/pictures/logo.png",
    }),
    safe(),
  ],
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC || "https://mainnet.base.org"),
    [baseSepolia.id]: http(
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || "https://sepolia.base.org"
    ),
  },
});