"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useAccount,
  useBalance,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther, formatEther } from "viem";

const ADMIN_WALLET = process.env.NEXT_PUBLIC_ADMIN_WALLET;

// Validate at import time
const ADMIN_WALLET_VALID =
  ADMIN_WALLET &&
  /^0x[0-9a-fA-F]{40}$/.test(ADMIN_WALLET);

export function useBuy() {
  const { address, chain } = useAccount();

  const [pendingNftData, setPendingNftData] = useState(null);
  const [confirmResult, setConfirmResult] = useState(null);
  const [confirmError, setConfirmError] = useState(null);
  const [confirming, setConfirming] = useState(false);

  // ── Balance check — reads from connected chain, not forced ──
  const { data: balanceData } = useBalance({
    address: address || undefined,
    query: { enabled: Boolean(address) },
  });

  const userBalanceEth = balanceData
    ? parseFloat(formatEther(balanceData.value))
    : null;

  const {
    sendTransaction,
    data: txHash,
    isPending: isSending,
    error: sendError,
    reset: resetSend,
  } = useSendTransaction();

  const {
    isLoading: isWaiting,
    isSuccess: isConfirmedOnChain,
  } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: Boolean(txHash) },
  });

  const buy = useCallback(
    (nftData) => {
      if (!ADMIN_WALLET_VALID) {
        setConfirmError(
          "Admin wallet is not configured correctly. Check NEXT_PUBLIC_ADMIN_WALLET in .env.local."
        );
        return;
      }

      if (!nftData?.totalPrice) {
        setConfirmError("Missing total price");
        return;
      }

      const totalNum = parseFloat(String(nftData.totalPrice));
      if (!Number.isFinite(totalNum) || totalNum <= 0) {
        setConfirmError("Invalid price");
        return;
      }

      // Balance check
      if (userBalanceEth !== null && userBalanceEth < totalNum) {
        setConfirmError(
          `Insufficient balance. This NFT costs ${totalNum.toFixed(6)} ETH, ` +
          `your wallet has ${userBalanceEth.toFixed(6)} ETH.`
        );
        return;
      }

      setPendingNftData(nftData);
      setConfirmResult(null);
      setConfirmError(null);

      sendTransaction({
        to: ADMIN_WALLET,
        value: parseEther(String(nftData.totalPrice)),
      });
    },
    [sendTransaction, userBalanceEth]
  );

  useEffect(() => {
    if (!isConfirmedOnChain || !txHash || !pendingNftData || confirming || confirmResult) {
      return;
    }

    const finalize = async () => {
      setConfirming(true);

      try {
        const res = await fetch("/api/nft/finalize-purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            txHash,
            nft: pendingNftData,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Finalize failed");
        }

        setConfirmResult(data);
      } catch (e) {
        setConfirmError(e?.message || "Finalize failed");
      } finally {
        setConfirming(false);
      }
    };

    finalize();
  }, [isConfirmedOnChain, txHash, pendingNftData, confirming, confirmResult]);

  useEffect(() => {
    if (sendError) {
      setConfirmError(
        sendError.shortMessage || sendError.message || "Transaction failed"
      );
    }
  }, [sendError]);

  const resetBuy = useCallback(() => {
    resetSend();
    setPendingNftData(null);
    setConfirmResult(null);
    setConfirmError(null);
  }, [resetSend]);

  return {
    buy,
    txHash,
    isSending,
    isWaiting,
    isConfirmedOnChain,
    confirming,
    confirmResult,
    confirmError,
    resetBuy,
    address,
    userBalanceEth,
  };
}
