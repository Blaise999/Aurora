'use client';

import { useState, useCallback } from 'react';
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from 'wagmi';
import { parseEther } from 'viem';
import { BUY_COLLECTOR_ABI, getBuyCollectorAddress, getChainId } from '@/lib/web3/contract';

/**
 * useBuy — handles the full NFT buy flow:
 * 1. Call BuyCollector.buy(nftId) with value = price + fee
 * 2. Wait for on-chain confirmation
 * 3. POST /api/nft/buy to save in DB + notify admin
 */
export function useBuy() {
  const { address } = useAccount();
  const buyCollectorAddress = getBuyCollectorAddress();
  const chainId = getChainId();

  const [confirmResult, setConfirmResult] = useState(null);
  const [confirmError, setConfirmError] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const {
    writeContract,
    data: txHash,
    isPending: isSending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const {
    isLoading: isWaiting,
    isSuccess: isConfirmedOnChain,
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: Boolean(txHash) },
  });

  /**
   * Execute buy transaction
   * @param {string} nftId - The NFT ID from the DB
   * @param {string} priceEth - NFT price in ETH (string, e.g. "0.85")
   * @param {string} feeEth - Buy fee in ETH (string, e.g. "0.002")
   */
  const buy = useCallback(
    (nftId, priceEth, feeEth) => {
      if (!buyCollectorAddress) {
        console.error('BUY_COLLECTOR_CONTRACT not configured');
        return;
      }
      const totalEth = (parseFloat(priceEth) + parseFloat(feeEth)).toFixed(18);
      const value = parseEther(totalEth);

      writeContract({
        address: buyCollectorAddress,
        abi: BUY_COLLECTOR_ABI,
        functionName: 'buy',
        args: [String(nftId)],
        value,
        chainId,
      });
    },
    [buyCollectorAddress, chainId, writeContract]
  );

  /** After on-chain confirm, save to server */
  const confirmBuy = useCallback(
    async (hash, nftId, priceEth, feeEth, name) => {
      setConfirming(true);
      setConfirmError(null);
      try {
        const res = await fetch('/api/nft/buy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            txHash: hash,
            nftId,
            pricePaid: (parseFloat(priceEth) + parseFloat(feeEth)).toFixed(6),
            name,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Confirm failed');
        setConfirmResult(data);
      } catch (e) {
        setConfirmError(e.message);
      } finally {
        setConfirming(false);
      }
    },
    []
  );

  const resetBuy = useCallback(() => {
    resetWrite();
    setConfirmResult(null);
    setConfirmError(null);
  }, [resetWrite]);

  return {
    buy,
    txHash,
    isSending,
    isWaiting,
    isConfirmedOnChain,
    receipt,
    writeError,
    confirmBuy,
    confirming,
    confirmResult,
    confirmError,
    resetBuy,
    address,
    buyCollectorAddress,
  };
}
