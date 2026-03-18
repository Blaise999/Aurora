"use client";
import { createContext, useContext, useState, useCallback, lazy, Suspense } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { getChainId } from "@/lib/web3/contract";

const LazyWalletModal = lazy(() => import("@/components/WalletConnectModal"));

const WalletContext = createContext(null);

/**
 * WalletProvider — wraps wagmi hooks so legacy code using useWallet()
 * still works, but now routes through wagmi (supports ALL wallets,
 * not just MetaMask via window.ethereum).
 *
 * Also renders a global WalletConnectModal so any component that calls
 * connect() will trigger the multi-wallet picker.
 */
export function WalletProvider({ children }) {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending: connecting } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { switchChain: wagmiSwitchChain } = useSwitchChain();

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [error, setError] = useState(null);

  const targetChainId = getChainId();
  const chainId = chain?.id || null;
  const isWrongChain = isConnected && chainId !== targetChainId;

  // Open the wallet connect modal (used by components that call useWallet().connect)
  const openConnect = useCallback(() => {
    setError(null);
    setShowWalletModal(true);
  }, []);

  // Quick-connect: tries a specific connector (for programmatic use)
  const quickConnect = useCallback(
    async (connector) => {
      setError(null);
      try {
        const c = connector || connectors[0];
        if (!c) {
          setError("No wallet connectors available");
          return;
        }
        connect({ connector: c });
      } catch (err) {
        setError(err?.message || "Connection failed");
      }
    },
    [connect, connectors]
  );

  const disconnect = useCallback(() => {
    wagmiDisconnect();
    setError(null);
  }, [wagmiDisconnect]);

  const switchChain = useCallback(async () => {
    try {
      wagmiSwitchChain({ chainId: targetChainId });
    } catch (err) {
      setError(err?.message || "Failed to switch chain");
    }
  }, [wagmiSwitchChain, targetChainId]);

  return (
    <WalletContext.Provider
      value={{
        address: address ? String(address).toLowerCase() : null,
        chainId,
        isConnected,
        isWrongChain,
        connecting,
        error,
        connect: openConnect,
        quickConnect,
        disconnect,
        switchChain,
        showWalletModal,
        setShowWalletModal,
      }}
    >
      {children}
      {/* Global wallet modal — any component calling connect() triggers this */}
      {showWalletModal && (
        <Suspense fallback={null}>
          <LazyWalletModal
            open={showWalletModal}
            onClose={() => setShowWalletModal(false)}
          />
        </Suspense>
      )}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
