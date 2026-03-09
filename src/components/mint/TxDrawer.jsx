'use client';
import { X, Check, Loader2, ExternalLink } from 'lucide-react';
import Button from '@/components/ui/Button';

const steps = [
  { id: 'confirm', label: 'Confirm' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'confirmed', label: 'Confirmed' },
];

export default function TxDrawer({
  open, onClose, currentStep = 'confirm', quantity = 1, price = '0.002',
  txHash, explorerUrl = 'https://sepolia.basescan.org', onConfirm, isSending = false,
}) {
  if (!open) return null;
  const stepIndex = steps.findIndex(s => s.id === currentStep);
  const total = (parseFloat(price) * quantity).toFixed(6);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-bg/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 glass-strong rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-light">
          <h3 className="font-display font-semibold text-text">Transaction</h3>
          <button onClick={onClose} className="p-1 text-muted hover:text-text transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between px-8 py-5">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div className={`
                  w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300
                  ${i < stepIndex ? 'bg-success text-bg' : ''}
                  ${i === stepIndex ? 'bg-accent text-bg' : ''}
                  ${i > stepIndex ? 'bg-surface2 text-muted-dim border border-border' : ''}
                `}>
                  {i < stepIndex ? (
                    <Check size={16} />
                  ) : i === stepIndex && currentStep === 'submitted' ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <span className="text-xs font-mono">{i + 1}</span>
                  )}
                </div>
                <span className={`text-[11px] ${i <= stepIndex ? 'text-text' : 'text-muted-dim'}`}>
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-12 sm:w-16 h-px mx-2 mt-[-18px] ${i < stepIndex ? 'bg-success' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-5 pb-5 space-y-4">
          {currentStep === 'confirm' && (
            <>
              <div className="bg-surface2/50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Quantity</span>
                  <span className="text-text font-mono">{quantity}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Price each</span>
                  <span className="text-text font-mono">{price} ETH</span>
                </div>
                <div className="border-t border-border-light pt-3 flex justify-between">
                  <span className="text-sm font-medium text-text">Total</span>
                  <span className="text-base font-mono font-semibold text-accent">{total} ETH</span>
                </div>
              </div>
              <Button variant="primary" size="lg" className="w-full" onClick={onConfirm} disabled={isSending}>
                {isSending ? (
                  <><Loader2 size={16} className="animate-spin" /> Waiting for wallet…</>
                ) : (
                  'Confirm in wallet'
                )}
              </Button>
            </>
          )}
          {currentStep === 'submitted' && (
            <div className="text-center py-6 space-y-3">
              <Loader2 size={40} className="mx-auto text-accent animate-spin" />
              <p className="text-text font-medium">Transaction submitted</p>
              <p className="text-sm text-muted">Waiting for confirmation…</p>
              {txHash && (
                <a href={`${explorerUrl}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-accent font-mono hover:underline inline-flex items-center gap-1">
                  <ExternalLink size={10} /> View on Basescan
                </a>
              )}
            </div>
          )}
          {currentStep === 'confirmed' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                <Check size={28} className="text-success" />
              </div>
              <div>
                <p className="text-text font-semibold text-lg">Mint successful!</p>
                <p className="text-sm text-muted mt-1">Your NFT has been minted and recorded</p>
              </div>
              {txHash && (
                <a href={`${explorerUrl}/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" size="md" className="mx-auto">
                    <ExternalLink size={14} /> View on Basescan
                  </Button>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
