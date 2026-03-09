'use client';
import { useState, useEffect, useCallback } from 'react';
import { Wallet, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { useAccount, useConnect, useSwitchChain } from 'wagmi';
import { useAuth } from '@/hooks/useAuth';
import { useMint } from '@/hooks/useMint';
import { getChainId, getExplorerUrl } from '@/lib/web3/contract';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import QuantityStepper from './QuantityStepper';
import TxDrawer from './TxDrawer';

export default function MintPanel() {
  const [quantity, setQuantity] = useState(1);
  const [showDrawer, setShowDrawer] = useState(false);

  const { address, isConnected, chain } = useAccount();
  const { connectors, connect, isPending: isConnectPending } = useConnect();
  const { switchChain } = useSwitchChain();
  const { isAuthed, login, loading: authLoading } = useAuth();

  const {
    priceEth, totalMinted, maxSupply, saleActive, remaining,
    mint, txHash, isSending, isWaiting, isConfirmedOnChain,
    writeError, confirmMint, confirming, confirmResult, confirmError, resetMint,
  } = useMint();

  const targetChainId = getChainId();
  const isWrongChain = isConnected && chain?.id !== targetChainId;
  const chainName = targetChainId === 8453 ? 'Base' : 'Base Sepolia';
  const explorerUrl = getExplorerUrl();

  const total = (parseFloat(priceEth) * quantity).toFixed(6);
  const progress = maxSupply > 0 ? (totalMinted / maxSupply) * 100 : 0;

  // Derive state
  let currentState = 'disconnected';
  if (isConnected && isWrongChain) currentState = 'wrong_network';
  else if (isConnected && !isAuthed) currentState = 'needs_auth';
  else if (confirmResult) currentState = 'tx_success';
  else if (confirmError || writeError) currentState = 'tx_error';
  else if (confirming) currentState = 'confirming';
  else if (isWaiting) currentState = 'tx_pending';
  else if (isSending) currentState = 'tx_signing';
  else if (isConnected && isAuthed) currentState = saleActive ? 'sale_live' : 'sale_paused';

  // Auto-confirm after on-chain confirmation
  useEffect(() => {
    if (isConfirmedOnChain && txHash && !confirmResult && !confirming) {
      confirmMint(txHash);
    }
  }, [isConfirmedOnChain, txHash, confirmResult, confirming, confirmMint]);

  const handleMint = useCallback(() => {
    resetMint();
    setShowDrawer(true);
  }, [resetMint]);

  const handleConfirmInDrawer = useCallback(() => {
    mint(quantity);
  }, [mint, quantity]);

  const handleConnect = () => {
    const connector = connectors[0];
    if (connector) connect({ connector });
  };

  // Drawer step
  let drawerStep = 'confirm';
  if (isSending) drawerStep = 'confirm';
  if (txHash && (isWaiting || confirming)) drawerStep = 'submitted';
  if (confirmResult) drawerStep = 'confirmed';

  return (
    <>
      <div className="glass-card rounded-card p-6 sm:p-8 space-y-6 relative">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-semibold text-text">Mint</h2>
            {currentState === 'sale_live' && <Badge color="success" dot>Live</Badge>}
            {currentState === 'sale_paused' && <Badge color="warning" dot>Paused</Badge>}
            {(currentState === 'tx_pending' || currentState === 'tx_signing' || currentState === 'confirming') && <Badge color="warning" dot>Pending</Badge>}
            {currentState === 'tx_success' && <Badge color="success" dot>Complete</Badge>}
            {currentState === 'tx_error' && <Badge color="danger" dot>Error</Badge>}
          </div>
          <p className="text-sm text-muted">AuroraNft Collection</p>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Minted</span>
            <span className="text-text font-mono">{totalMinted.toLocaleString()} / {maxSupply.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-surface2 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent-violet transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Price info */}
        <div className="bg-surface2/40 rounded-xl p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Price</span>
            <span className="text-text font-mono font-medium">{priceEth} ETH</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Max per tx</span>
            <span className="text-text font-mono">5</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Network</span>
            <span className="text-text font-mono">{chainName}</span>
          </div>
        </div>

        {/* Disconnected */}
        {currentState === 'disconnected' && (
          <div className="space-y-4">
            <div className="text-center py-4 space-y-2">
              <Wallet size={32} className="mx-auto text-muted-dim" />
              <p className="text-sm text-muted">Connect your wallet to mint</p>
            </div>
            <Button variant="primary" size="lg" className="w-full" onClick={handleConnect} disabled={isConnectPending}>
              {isConnectPending ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
              Connect Wallet
            </Button>
          </div>
        )}

        {/* Needs auth */}
        {currentState === 'needs_auth' && (
          <div className="space-y-4">
            <div className="text-center py-4 space-y-2">
              <Wallet size={32} className="mx-auto text-accent" />
              <p className="text-sm text-muted">Sign in to verify your wallet</p>
            </div>
            <Button variant="primary" size="lg" className="w-full" onClick={login} disabled={authLoading}>
              {authLoading ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
              Sign In (SIWE)
            </Button>
          </div>
        )}

        {/* Wrong Network */}
        {currentState === 'wrong_network' && (
          <div className="space-y-4">
            <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-warning mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-warning">Wrong Network</p>
                <p className="text-xs text-muted mt-1">Please switch to {chainName} to continue.</p>
              </div>
            </div>
            <Button variant="primary" size="lg" className="w-full" onClick={() => switchChain({ chainId: targetChainId })}>
              Switch to {chainName}
            </Button>
          </div>
        )}

        {/* Sale paused */}
        {currentState === 'sale_paused' && (
          <div className="text-center py-6 space-y-2">
            <p className="text-sm text-muted">Sale is currently paused. Check back soon.</p>
          </div>
        )}

        {/* Sale live */}
        {currentState === 'sale_live' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Quantity</span>
              <QuantityStepper value={quantity} onChange={setQuantity} max={5} />
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-border-light">
              <span className="text-sm font-medium text-text">Total</span>
              <span className="text-xl font-mono font-semibold text-accent">{total} ETH</span>
            </div>
            <Button variant="primary" size="lg" className="w-full" onClick={handleMint}>
              Mint Now
            </Button>
          </div>
        )}

        {/* Pending states */}
        {(currentState === 'tx_signing' || currentState === 'tx_pending' || currentState === 'confirming') && (
          <div className="text-center py-6 space-y-3">
            <Loader2 size={36} className="mx-auto text-accent animate-spin" />
            <p className="text-sm text-muted">
              {currentState === 'tx_signing' && 'Confirm in your wallet…'}
              {currentState === 'tx_pending' && 'Transaction pending…'}
              {currentState === 'confirming' && 'Verifying on server…'}
            </p>
            {txHash && (
              <a href={`${explorerUrl}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                className="text-xs text-accent font-mono hover:underline">
                View on Basescan
              </a>
            )}
          </div>
        )}

        {/* Success */}
        {currentState === 'tx_success' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <Check size={28} className="text-success" />
            </div>
            <p className="text-text font-semibold">Successfully minted!</p>
            {confirmResult?.tokenIds?.length > 0 && (
              <p className="text-sm text-muted">Token ID{confirmResult.tokenIds.length > 1 ? 's' : ''}: {confirmResult.tokenIds.join(', ')}</p>
            )}
            <div className="flex gap-3 justify-center">
              {txHash && (
                <a href={`${explorerUrl}/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" size="md">View on Basescan</Button>
                </a>
              )}
              <Button variant="secondary" size="md" onClick={() => { resetMint(); setQuantity(1); }}>
                Mint Another
              </Button>
            </div>
          </div>
        )}

        {/* Error */}
        {currentState === 'tx_error' && (
          <div className="space-y-4">
            <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-danger mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-danger">Transaction Failed</p>
                <p className="text-xs text-muted mt-1 break-all">
                  {writeError?.shortMessage || confirmError || 'User rejected or insufficient funds.'}
                </p>
              </div>
            </div>
            <Button variant="primary" size="lg" className="w-full" onClick={() => { resetMint(); }}>
              Try Again
            </Button>
          </div>
        )}
      </div>

      <TxDrawer
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        currentStep={drawerStep}
        quantity={quantity}
        price={priceEth}
        txHash={txHash}
        explorerUrl={explorerUrl}
        onConfirm={handleConfirmInDrawer}
        isSending={isSending}
      />
    </>
  );
}
