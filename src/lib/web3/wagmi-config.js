import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet, safe } from "wagmi/connectors";

const wcProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || "";

// Build connectors array — only add WalletConnect if project ID exists
const connectors = [
  injected({ shimDisconnect: true }),
  coinbaseWallet({
    appName: "AuroraNft",
    appLogoUrl: "https://aurora-nft.vercel.app/pictures/logo.png",
  }),
  safe(),
];

// Only add WalletConnect if configured — avoids "provider not found" errors
if (wcProjectId) {
  connectors.splice(
    1,
    0,
    walletConnect({
      projectId: wcProjectId,
      showQrModal: true,
      metadata: {
        name: "AuroraNft",
        description: "Discover & Mint Digital Art on Base",
        url: "https://aurora-nft.vercel.app",
        icons: ["https://aurora-nft.vercel.app/pictures/logo.png"],
      },
    })
  );
}

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  ssr: true,
  connectors,
  transports: {
    [base.id]: http(
      process.env.NEXT_PUBLIC_BASE_RPC || "https://mainnet.base.org"
    ),
    [baseSepolia.id]: http(
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || "https://sepolia.base.org"
    ),
  },
});
