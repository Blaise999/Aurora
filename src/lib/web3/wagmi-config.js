import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet, safe } from "wagmi/connectors";

// WalletConnect Cloud Project ID — get yours free at https://cloud.walletconnect.com
// Enables Trust Wallet, Rainbow, Zerion, Uniswap Wallet, and 300+ mobile wallets
const wcProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || "";

const connectorList = [
  // 1. Injected — MetaMask, Trust Wallet (in-app browser), Brave, Rabby, etc.
  injected({ shimDisconnect: true }),

  // 2. Coinbase Wallet — native + smart wallet
  coinbaseWallet({
    appName: "AuroraNft",
    appLogoUrl: "/pictures/logo.png",
  }),

  // 3. Safe (Gnosis Safe)
  safe(),
];

// 4. WalletConnect — Trust Wallet (external), Rainbow, Zerion, etc.
if (wcProjectId) {
  connectorList.push(
    walletConnect({
      projectId: wcProjectId,
      showQrModal: true,
      metadata: {
        name: "AuroraNft",
        description: "Discover & Mint Digital Art on Base",
        url: typeof window !== "undefined" ? window.location.origin : "https://aurora-nft.vercel.app",
        icons: ["/pictures/logo.png"],
      },
    })
  );
}

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  ssr: true,
  connectors: connectorList,
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC || "https://mainnet.base.org"),
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || "https://sepolia.base.org"),
  },
});
