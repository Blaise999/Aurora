'use client';
import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Plus, X, Check, User, Layers, Image as ImageIcon } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

export default function AssignCollection() {
  const [profiles, setProfiles] = useState([]);
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedNft, setSelectedNft] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [profileSearch, setProfileSearch] = useState('');
  const [nftSearch, setNftSearch] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/wallet-names');
      const data = await res.json();
      setProfiles(data.profiles || []);
    } catch {}
  }, []);

  const fetchNfts = useCallback(async () => {
    try {
      const res = await fetch('/api/nft/cached?limit=500&admin=true&shuffle=false');
      const data = await res.json();
      setNfts(data.nfts || []);
    } catch {}
  }, []);

  const fetchAssignments = useCallback(async (profileId) => {
    if (!profileId) return;
    setAssignLoading(true);
    try {
      const res = await fetch(`/api/user/collections?profileId=${profileId}`);
      const data = await res.json();
      setAssignments(data.nfts || []);
    } catch {}
    setAssignLoading(false);
  }, []);

  useEffect(() => {
    Promise.all([fetchProfiles(), fetchNfts()]).then(() => setLoading(false));
  }, [fetchProfiles, fetchNfts]);

  useEffect(() => {
    if (selectedProfile) fetchAssignments(selectedProfile.id);
    else setAssignments([]);
  }, [selectedProfile, fetchAssignments]);

  const handleAssign = async () => {
    if (!selectedProfile || !selectedNft) return;
    setAssigning(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/assign-collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: selectedProfile.id,
          cachedNftId: selectedNft.dbId || null,
          chainId: selectedNft.chainId || 8453,
          contractAddress: selectedNft.contractAddress,
          tokenId: selectedNft.tokenId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSuccess(`Assigned "${selectedNft.name}" to ${selectedProfile.first_name || selectedProfile.username || 'user'}`);
      setSelectedNft(null);
      fetchAssignments(selectedProfile.id);
    } catch (e) {
      setError(e.message);
    }
    setAssigning(false);
  };

  const handleRemove = async (nft) => {
    if (!selectedProfile) return;
    try {
      await fetch('/api/admin/assign-collection', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: selectedProfile.id,
          chainId: nft.chainId || 8453,
          contractAddress: nft.contractAddress,
          tokenId: nft.tokenId,
        }),
      });
      fetchAssignments(selectedProfile.id);
    } catch {}
  };

  const filteredProfiles = profiles.filter(p => {
    if (!profileSearch) return true;
    const s = profileSearch.toLowerCase();
    return (p.first_name?.toLowerCase().includes(s)) || (p.username?.toLowerCase().includes(s)) || (p.email?.toLowerCase().includes(s));
  });

  const filteredNfts = nfts.filter(n => {
    if (!nftSearch) return true;
    const s = nftSearch.toLowerCase();
    return (n.name?.toLowerCase().includes(s)) || (n.collection?.toLowerCase().includes(s)) || (n.contractAddress?.toLowerCase().includes(s));
  });

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-lg text-text flex items-center gap-2">
          <Layers size={18} className="text-accent" /> Assign NFTs to Users
        </h2>
        <p className="text-xs text-muted mt-0.5">Tap an NFT, pick a user, and assign it to their collection.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Step 1: Select User */}
        <Card className="p-5 space-y-4">
          <h3 className="font-display font-semibold text-sm text-text flex items-center gap-2"><User size={14} className="text-accent" /> 1. Select User</h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-dim" />
            <input type="text" value={profileSearch} onChange={(e) => setProfileSearch(e.target.value)}
              placeholder="Search users..." className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface2 border border-border-light text-sm text-text placeholder:text-muted-dim/50 focus:outline-none focus:border-accent/40" />
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1.5 scrollbar-thin">
            {filteredProfiles.map(p => (
              <button key={p.id} onClick={() => { setSelectedProfile(p); setSuccess(''); }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${selectedProfile?.id === p.id ? 'bg-accent/10 border border-accent/30' : 'hover:bg-white/[0.03] border border-transparent'}`}>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent/20 to-accent-violet/20 flex items-center justify-center shrink-0">
                  <span className="font-bold text-xs text-accent">{p.first_name?.[0]?.toUpperCase() || '?'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{p.first_name || p.username || 'User'}</p>
                  <p className="text-[10px] text-muted-dim truncate">{p.email}</p>
                </div>
                {selectedProfile?.id === p.id && <Check size={14} className="text-accent shrink-0" />}
              </button>
            ))}
          </div>
        </Card>

        {/* Step 2: Select NFT */}
        <Card className="p-5 space-y-4">
          <h3 className="font-display font-semibold text-sm text-text flex items-center gap-2"><ImageIcon size={14} className="text-accent" /> 2. Select NFT</h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-dim" />
            <input type="text" value={nftSearch} onChange={(e) => setNftSearch(e.target.value)}
              placeholder="Search NFTs..." className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface2 border border-border-light text-sm text-text placeholder:text-muted-dim/50 focus:outline-none focus:border-accent/40" />
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1.5 scrollbar-thin">
            {filteredNfts.slice(0, 100).map(n => (
              <button key={n.id} onClick={() => { setSelectedNft(n); setSuccess(''); }}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${selectedNft?.id === n.id ? 'bg-accent/10 border border-accent/30' : 'hover:bg-white/[0.03] border border-transparent'}`}>
                <div className="w-10 h-10 rounded-lg bg-surface2 overflow-hidden shrink-0">
                  {n.image ? <img src={n.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={14} className="text-muted-dim" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{n.name}</p>
                  <p className="text-[10px] text-muted-dim truncate">{n.collection}</p>
                </div>
                {selectedNft?.id === n.id && <Check size={14} className="text-accent shrink-0" />}
              </button>
            ))}
            {filteredNfts.length > 100 && <p className="text-xs text-muted-dim text-center py-2">Showing 100 of {filteredNfts.length} — refine search</p>}
          </div>
        </Card>
      </div>

      {/* Assign Button */}
      {selectedProfile && selectedNft && (
        <Card className="p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Badge color="accent">{selectedNft.name}</Badge>
              <span className="text-muted text-sm">→</span>
              <Badge color="violet">{selectedProfile.first_name || selectedProfile.username}</Badge>
            </div>
            <Button variant="primary" size="md" onClick={handleAssign} disabled={assigning}>
              {assigning ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {assigning ? 'Assigning...' : 'Assign to Collection'}
            </Button>
          </div>
          {success && <p className="text-success text-xs mt-3">{success}</p>}
          {error && <p className="text-danger text-xs mt-3">{error}</p>}
        </Card>
      )}

      {/* Current Assignments for Selected User */}
      {selectedProfile && (
        <Card className="p-5 space-y-4">
          <h3 className="font-display font-semibold text-sm text-text">
            {selectedProfile.first_name || selectedProfile.username}'s Collection ({assignments.length})
          </h3>
          {assignLoading ? (
            <Loader2 size={16} className="animate-spin text-accent" />
          ) : assignments.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {assignments.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface2/50 border border-border-light">
                  <div className="w-10 h-10 rounded-lg bg-surface overflow-hidden shrink-0">
                    {a.image ? <img src={a.image} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={14} className="text-muted-dim mx-auto mt-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text truncate">{a.name}</p>
                    <p className="text-[10px] text-muted-dim">{a.collection}</p>
                  </div>
                  <button onClick={() => handleRemove(a)} className="p-1.5 rounded-lg hover:bg-danger/10 text-muted-dim hover:text-danger transition-colors" title="Remove">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-dim text-xs">No NFTs assigned yet.</p>
          )}
        </Card>
      )}
    </div>
  );
}
