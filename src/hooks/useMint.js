'use client';

import { useState, useCallback } from 'react';
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContracts,
  useAccount,
} from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { AURORA_NFT_ABI, getContractAddress, getChainId } from '@/lib/web3/contract';

/**
 * useMint — handles the full mint flow:
 * 1. Read on-chain state (price, totalMinted, saleActive, etc.)
 * 2. writeContract → mint(quantity) with value
 * 3. Wait for receipt
 * 4. POST /api/mint/confirm { txHash }
 */
export function useMint() {
  const { address } = useAccount();
  const contractAddress = getContractAddress();
  const chainId = getChainId();

  const [confirmResult, setConfirmResult] = useState(null);
  const [confirmError, setConfirmError] = useState(null);
  const [confirming, setConfirming] = useState(false);

  // ── On-chain reads ──
  const contractConfig = {
    address: contractAddress,
    abi: AURORA_NFT_ABI,
    chainId,
  };

  const { data: reads, refetch: refetchReads } = useReadContracts({
    contracts: [
      { ...contractConfig, functionName: 'price' },
      { ...contractConfig, functionName: 'totalMinted' },
      { ...contractConfig, functionName: 'MAX_SUPPLY' },
      { ...contractConfig, functionName: 'saleActive' },
      { ...contractConfig, functionName: 'remainingSupply' },
    ],
    query: { enabled: Boolean(contractAddress) },
  });

  const price = reads?.[0]?.result;
  const totalMinted = reads?.[1]?.result;
  const maxSupply = reads?.[2]?.result;
  const saleActive = reads?.[3]?.result;
  const remaining = reads?.[4]?.result;

  const priceEth = price ? formatEther(price) : '0.002';
  const totalMintedNum = totalMinted ? Number(totalMinted) : 0;
  const maxSupplyNum = maxSupply ? Number(maxSupply) : 10000;

  // ── Write ──
  const {
    writeContract,
    data: txHash,
    isPending: isSending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  // ── Wait for receipt ──
  const {
    isLoading: isWaiting,
    isSuccess: isConfirmedOnChain,
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: Boolean(txHash) },
  });

  // ── Mint function ──
  const mint = useCallback(
    (quantity) => {
      if (!contractAddress || !price) return;
      const value = price * BigInt(quantity);
      writeContract({
        address: contractAddress,
        abi: AURORA_NFT_ABI,
        functionName: 'mint',
        args: [BigInt(quantity)],
        value,
        chainId,
      });
    },
    [contractAddress, price, chainId, writeContract]
  );

  // ── Server confirm ──
  const confirmMint = useCallback(
    async (hash) => {
      setConfirming(true);
      setConfirmError(null);
      try {
        const res = await fetch('/api/mint/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ txHash: hash }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Confirm failed');
        setConfirmResult(data);
        refetchReads();
      } catch (e) {
        setConfirmError(e.message);
      } finally {
        setConfirming(false);
      }
    },
    [refetchReads]
  );

  // ── Reset ──
  const resetMint = useCallback(() => {
    resetWrite();
    setConfirmResult(null);
    setConfirmError(null);
  }, [resetWrite]);

  return {
    // chain reads
    priceEth,
    totalMinted: totalMintedNum,
    maxSupply: maxSupplyNum,
    saleActive: Boolean(saleActive),
    remaining: remaining ? Number(remaining) : maxSupplyNum - totalMintedNum,
    refetchReads,

    // mint action
    mint,
    txHash,
    isSending,
    isWaiting,
    isConfirmedOnChain,
    receipt,
    writeError,

    // server confirm
    confirmMint,
    confirming,
    confirmResult,
    confirmError,

    resetMint,
    address,
    contractAddress,
  };
}
