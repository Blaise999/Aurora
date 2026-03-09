"use client";
import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { CHAIN_CONFIG, CHAIN_ID } from "@/lib/constants";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const isConnected = !!address;
  const isWrongChain = chainId && chainId !== CHAIN_ID;

  // Auto-connect if previously connected
  useEffect(() => {
    async function checkConnection() {
      if (typeof window === "undefined" || !window.ethereum) return;
      try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          const hexChain = await window.ethereum.request({ method: "eth_chainId" });
          setChainId(parseInt(hexChain, 16));
        }
      } catch (_) {}
    }
    checkConnection();
  }, []);

  // Listen for account/chain changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const handleAccounts = (accounts) => {
      if (accounts.length === 0) {
        setAddress(null);
      } else {
        setAddress(accounts[0]);
      }
    };
    const handleChain = (hexChain) => {
      setChainId(parseInt(hexChain, 16));
    };

    window.ethereum.on("accountsChanged", handleAccounts);
    window.ethereum.on("chainChanged", handleChain);
    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccounts);
      window.ethereum.removeListener("chainChanged", handleChain);
    };
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError("Please install MetaMask or another web3 wallet");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAddress(accounts[0]);
      const hexChain = await window.ethereum.request({ method: "eth_chainId" });
      setChainId(parseInt(hexChain, 16));
    } catch (err) {
      setError(err.message || "Failed to connect");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
  }, []);

  const switchChain = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CHAIN_CONFIG.chainId }],
      });
    } catch (err) {
      // Chain not added, try adding
      if (err.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [CHAIN_CONFIG],
        });
      }
    }
  }, []);

  return (
    <WalletContext.Provider
      value={{
        address,
        chainId,
        isConnected,
        isWrongChain,
        connecting,
        error,
        connect,
        disconnect,
        switchChain,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
