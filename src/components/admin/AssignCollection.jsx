"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Loader2,
  Plus,
  X,
  Check,
  User,
  Layers,
  Image as ImageIcon,
  Shuffle,
  Users,
  Sparkles,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

export default function AssignCollection() {
  const [profiles, setProfiles] = useState([]);
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedNft, setSelectedNft] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [profileSearch, setProfileSearch] = useState("");
  const [nftSearch, setNftSearch] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [profileTypeFilter, setProfileTypeFilter] = useState("all");
  const [bulkSeededOnly, setBulkSeededOnly] = useState(true);
  const [bulkMin, setBulkMin] = useState(20);
  const [bulkMax, setBulkMax] = useState(20);

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/wallet-names");
      const data = await res.json();
      setProfiles(data.profiles || []);
    } catch {}
  }, []);

  const fetchNfts = useCallback(async () => {
    try {
      const res = await fetch("/api/nft/cached?limit=500&admin=true&shuffle=false");
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

  const seededCount = useMemo(
    () => profiles.filter((p) => p.is_seeded).length,
    [profiles]
  );

  const regularCount = useMemo(
    () => profiles.filter((p) => !p.is_seeded).length,
    [profiles]
  );

  const handleAssign = async () => {
    if (!selectedProfile || !selectedNft) return;

    setAssigning(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/assign-collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: selectedProfile.id,
          cachedNftId: selectedNft.dbId || selectedNft.id || null,
          chainId: selectedNft.chainId || 8453,
          contractAddress: selectedNft.contractAddress || selectedNft.contract_address,
          tokenId: selectedNft.tokenId || selectedNft.token_id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      setSuccess(
        `Assigned "${selectedNft.name}" to ${
          selectedProfile.first_name || selectedProfile.username || "user"
        }`
      );
      setSelectedNft(null);
      fetchAssignments(selectedProfile.id);
    } catch (e) {
      setError(e.message);
    }

    setAssigning(false);
  };

  const handleBulkRandomize = async (minNfts, maxNfts) => {
    setBulkAssigning(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/assign-collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "bulk_randomize",
          seededOnly: bulkSeededOnly,
          minNfts,
          maxNfts,
          nftPoolLimit: 800,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk randomize failed");

      setSuccess(
        `Bulk randomized ${data.affectedRows || 0} assignments across ${
          data.profilesTargeted || 0
        } ${bulkSeededOnly ? "seeded" : "matching"} users (${data.minNfts}-${data.maxNfts} NFTs each).`
      );

      if (selectedProfile) fetchAssignments(selectedProfile.id);
    } catch (e) {
      setError(e.message);
    }

    setBulkAssigning(false);
  };

  const handleRemove = async (nft) => {
    if (!selectedProfile) return;

    try {
      await fetch("/api/admin/assign-collection", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: selectedProfile.id,
          chainId: nft.chain_id || nft.chainId || 8453,
          contractAddress: nft.contract_address || nft.contractAddress,
          tokenId: nft.token_id || nft.tokenId,
        }),
      });

      fetchAssignments(selectedProfile.id);
    } catch {}
  };

  const filteredProfiles = profiles.filter((p) => {
    if (profileTypeFilter === "seeded" && !p.is_seeded) return false;
    if (profileTypeFilter === "regular" && p.is_seeded) return false;

    if (!profileSearch) return true;
    const s = profileSearch.toLowerCase();

    return (
      p.first_name?.toLowerCase().includes(s) ||
      p.username?.toLowerCase().includes(s) ||
      p.email?.toLowerCase().includes(s)
    );
  });

  const filteredNfts = nfts.filter((n) => {
    if (!nftSearch) return true;
    const s = nftSearch.toLowerCase();

    return (
      n.name?.toLowerCase().includes(s) ||
      n.collection?.toLowerCase().includes(s) ||
      n.collection_name?.toLowerCase().includes(s) ||
      n.contractAddress?.toLowerCase().includes(s) ||
      n.contract_address?.toLowerCase().includes(s)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-text">
          <Layers size={18} className="text-accent" /> Assign NFTs to Users
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          Assign one-by-one or bulk-randomize NFTs for seeded users.
        </p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-text">
              <Shuffle size={14} className="text-accent" /> Bulk Randomize
            </h3>
            <p className="mt-1 text-xs text-muted">
              Fast-fill collections for seeded users or all matching users.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge color="accent">Seeded: {seededCount}</Badge>
            <Badge color="violet">Regular: {regularCount}</Badge>
            <Badge color="success">NFT Pool: {nfts.length}</Badge>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-border-light bg-surface2/40 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-dim">Target Users</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setBulkSeededOnly(true)}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                  bulkSeededOnly
                    ? "border border-accent/30 bg-accent/10 text-accent"
                    : "border border-border-light bg-transparent text-muted"
                }`}
              >
                Seeded Only
              </button>
              <button
                onClick={() => setBulkSeededOnly(false)}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                  !bulkSeededOnly
                    ? "border border-accent/30 bg-accent/10 text-accent"
                    : "border border-border-light bg-transparent text-muted"
                }`}
              >
                All Active
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border-light bg-surface2/40 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-dim">Minimum NFTs</p>
            <input
              type="number"
              min="1"
              value={bulkMin}
              onChange={(e) => setBulkMin(Number(e.target.value) || 1)}
              className="mt-3 w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-text outline-none"
            />
          </div>

          <div className="rounded-xl border border-border-light bg-surface2/40 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-dim">Maximum NFTs</p>
            <input
              type="number"
              min={bulkMin}
              value={bulkMax}
              onChange={(e) => setBulkMax(Number(e.target.value) || bulkMin)}
              className="mt-3 w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-text outline-none"
            />
          </div>

          <div className="rounded-xl border border-border-light bg-surface2/40 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-dim">Quick Presets</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setBulkMin(20);
                  setBulkMax(20);
                }}
                className="rounded-lg border border-border-light px-3 py-2 text-xs text-text"
              >
                20 each
              </button>
              <button
                onClick={() => {
                  setBulkMin(20);
                  setBulkMax(50);
                }}
                className="rounded-lg border border-border-light px-3 py-2 text-xs text-text"
              >
                20–50 each
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => handleBulkRandomize(20, 20)}
            disabled={bulkAssigning}
          >
            {bulkAssigning ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Users size={14} />
            )}
            20 NFTs × {bulkSeededOnly ? "Seeded" : "All"} Users
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => handleBulkRandomize(20, 50)}
            disabled={bulkAssigning}
          >
            {bulkAssigning ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Shuffle size={14} />
            )}
            Random 20–50 × {bulkSeededOnly ? "Seeded" : "All"} Users
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => handleBulkRandomize(bulkMin, bulkMax)}
            disabled={bulkAssigning}
          >
            {bulkAssigning ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            Run Custom Bulk
          </Button>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-text">
              <User size={14} className="text-accent" /> 1. Select User
            </h3>

            <div className="flex gap-2">
              <button
                onClick={() => setProfileTypeFilter("all")}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${
                  profileTypeFilter === "all"
                    ? "border border-accent/30 bg-accent/10 text-accent"
                    : "border border-border-light text-muted"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setProfileTypeFilter("seeded")}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${
                  profileTypeFilter === "seeded"
                    ? "border border-accent/30 bg-accent/10 text-accent"
                    : "border border-border-light text-muted"
                }`}
              >
                Seeded
              </button>
              <button
                onClick={() => setProfileTypeFilter("regular")}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${
                  profileTypeFilter === "regular"
                    ? "border border-accent/30 bg-accent/10 text-accent"
                    : "border border-border-light text-muted"
                }`}
              >
                Regular
              </button>
            </div>
          </div>

          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-dim"
            />
            <input
              type="text"
              value={profileSearch}
              onChange={(e) => setProfileSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full rounded-lg border border-border-light bg-surface2 py-2 pl-9 pr-3 text-sm text-text placeholder:text-muted-dim/50 focus:border-accent/40 focus:outline-none"
            />
          </div>

          <div className="max-h-60 space-y-1.5 overflow-y-auto scrollbar-thin">
            {filteredProfiles.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedProfile(p);
                  setSuccess("");
                }}
                className={`w-full rounded-xl border p-3 text-left transition-all ${
                  selectedProfile?.id === p.id
                    ? "border-accent/30 bg-accent/10"
                    : "border-transparent hover:bg-white/[0.03]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent/20 to-accent-violet/20">
                    <span className="text-xs font-bold text-accent">
                      {p.first_name?.[0]?.toUpperCase() ||
                        p.username?.[0]?.toUpperCase() ||
                        "?"}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-text">
                        {p.first_name || p.username || "User"}
                      </p>
                      {p.is_seeded ? (
                        <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                          Seeded
                        </span>
                      ) : (
                        <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                          Regular
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[10px] text-muted-dim">{p.email}</p>
                    {p.username ? (
                      <p className="truncate text-[10px] text-muted-dim">@{p.username}</p>
                    ) : null}
                  </div>

                  {selectedProfile?.id === p.id && (
                    <Check size={14} className="shrink-0 text-accent" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-text">
            <ImageIcon size={14} className="text-accent" /> 2. Select NFT
          </h3>

          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-dim"
            />
            <input
              type="text"
              value={nftSearch}
              onChange={(e) => setNftSearch(e.target.value)}
              placeholder="Search NFTs..."
              className="w-full rounded-lg border border-border-light bg-surface2 py-2 pl-9 pr-3 text-sm text-text placeholder:text-muted-dim/50 focus:border-accent/40 focus:outline-none"
            />
          </div>

          <div className="max-h-60 space-y-1.5 overflow-y-auto scrollbar-thin">
            {filteredNfts.slice(0, 100).map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  setSelectedNft(n);
                  setSuccess("");
                }}
                className={`w-full flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all ${
                  selectedNft?.id === n.id
                    ? "border-accent/30 bg-accent/10"
                    : "border-transparent hover:bg-white/[0.03]"
                }`}
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface2">
                  {n.image || n.image_url ? (
                    <img
                      src={n.image || n.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon size={14} className="text-muted-dim" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{n.name}</p>
                  <p className="truncate text-[10px] text-muted-dim">
                    {n.collection || n.collection_name}
                  </p>
                </div>

                {selectedNft?.id === n.id && (
                  <Check size={14} className="shrink-0 text-accent" />
                )}
              </button>
            ))}

            {filteredNfts.length > 100 && (
              <p className="py-2 text-center text-xs text-muted-dim">
                Showing 100 of {filteredNfts.length} — refine search
              </p>
            )}
          </div>
        </Card>
      </div>

      {selectedProfile && selectedNft && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Badge color="accent">{selectedNft.name}</Badge>
              <span className="text-sm text-muted">→</span>
              <Badge color="violet">
                {selectedProfile.first_name || selectedProfile.username}
              </Badge>
              {selectedProfile.is_seeded ? (
                <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold text-cyan-300">
                  Seeded
                </span>
              ) : (
                <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-[10px] font-semibold text-violet-300">
                  Regular
                </span>
              )}
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleAssign}
              disabled={assigning}
            >
              {assigning ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              {assigning ? "Assigning..." : "Assign to Collection"}
            </Button>
          </div>

          {success && <p className="mt-3 text-xs text-success">{success}</p>}
          {error && <p className="mt-3 text-xs text-danger">{error}</p>}
        </Card>
      )}

      {selectedProfile && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="font-display text-sm font-semibold text-text">
              {selectedProfile.first_name || selectedProfile.username}'s Collection ({assignments.length})
            </h3>

            {selectedProfile.is_seeded ? (
              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold text-cyan-300">
                Seeded Account
              </span>
            ) : (
              <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-[10px] font-semibold text-violet-300">
                Regular Account
              </span>
            )}
          </div>

          {assignLoading ? (
            <Loader2 size={16} className="animate-spin text-accent" />
          ) : assignments.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-xl border border-border-light bg-surface2/50 p-3"
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface">
                    {a.image_url || a.image ? (
                      <img
                        src={a.image_url || a.image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon size={14} className="mx-auto mt-3 text-muted-dim" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-text">
                      {a.nft_name || a.name}
                    </p>
                    <p className="text-[10px] text-muted-dim">{a.collection}</p>
                  </div>

                  <button
                    onClick={() => handleRemove(a)}
                    className="rounded-lg p-1.5 text-muted-dim transition-colors hover:bg-danger/10 hover:text-danger"
                    title="Remove"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-dim">No NFTs assigned yet.</p>
          )}
        </Card>
      )}
    </div>
  );
}
