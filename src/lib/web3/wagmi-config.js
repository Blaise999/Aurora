import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet, safe } from "wagmi/connectors";

const wcProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || "";

// Base Mainnet first — contract deployed on 8453
const chains = [base, baseSepolia];

// Build connectors array
// - injected() with shimDisconnect: false so it doesn't fight with EIP-6963
// - EIP-6963 multiInjectedProviderDiscovery is ON by default in wagmi v2
//   which auto-detects OKX, Phantom, Rabby, Trust, Brave, etc.
const connectors = [
  injected({
    shimDisconnect: false,
    // This is the fallback injected connector.
    // EIP-6963 wallets (OKX, Phantom, Rabby, etc.) are discovered
    // automatically by wagmi and appear as separate connectors.
  }),
  coinbaseWallet({
    appName: "AuroraNFT",
    appLogoUrl: "https://auroranft.art/pictures/logo.png",
  }),
  safe(),
];

// WalletConnect supports 300+ wallets via QR code / deep link
// OKX, Trust, Rainbow, Zerion, Phantom, etc. all work through WC
if (wcProjectId) {
  connectors.splice(
    1,
    0,
    walletConnect({
      projectId: wcProjectId,
      showQrModal: true,
      metadata: {
        name: "AuroraNFT",
        description: "Discover & Collect Digital Art on Base",
        url: "https://auroranft.art",
        icons: ["https://auroranft.art/pictures/logo.png"],
      },
    })
  );
}

export const wagmiConfig = createConfig({
  chains,
  ssr: true,
  connectors,
  // multiInjectedProviderDiscovery is true by default in wagmi v2
  // This enables EIP-6963 which auto-discovers installed wallets:
  // OKX, Phantom, Rabby, Frame, Taho, etc.
  multiInjectedProviderDiscovery: true,
  transports: {
    [base.id]: http(
      process.env.NEXT_PUBLIC_BASE_RPC || "https://mainnet.base.org"
    ),
    [baseSepolia.id]: http(
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || "https://sepolia.base.org"
    ),
  },
});
