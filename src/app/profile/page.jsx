'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useConnect } from 'wagmi';
import { Wallet, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function ProfilePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  useEffect(() => { if (isConnected && address) router.replace(`/profile/${address}`); }, [isConnected, address, router]);
  const handleConnect = () => { const c = connectors[0]; if (c) connect({ connector: c }); };
  if (!isConnected) return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto"><Wallet size={28} className="text-accent" /></div>
        <div><h1 className="font-display font-bold text-2xl text-text mb-2">Connect Your Wallet</h1><p className="text-sm text-muted leading-relaxed">Connect your wallet to view your profile, favorites, and minted NFTs.</p></div>
        <Button variant="primary" size="lg" className="w-full" onClick={handleConnect} disabled={isPending}>{isPending ? <Loader2 size={16} className="animate-spin"/> : <Wallet size={16}/>} Connect Wallet</Button>
      </div>
    </div>
  );
  return <div className="min-h-[70vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"/></div>;
}
