"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, Users, ArrowUpRight, Sparkles } from "lucide-react";

function EmptyState({ hasTyped }) {
  if (!hasTyped) {
    return (
      <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-violet-500/20 text-cyan-300">
          <Search size={22} />
        </div>
        <h3 className="text-lg font-semibold text-white">Search collectors and creators</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/50">
          Start typing a username or name to discover public Aurora profiles.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-violet-500/20 text-cyan-300">
        <Users size={22} />
      </div>
      <h3 className="text-lg font-semibold text-white">No matching profiles</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/50">
        Try a different username, name, or a shorter keyword.
      </p>
    </div>
  );
}

export default function PublicUserSearch() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const trimmed = q.trim();
  const hasTyped = trimmed.length > 0;

  useEffect(() => {
    const controller = new AbortController();

    if (!hasTyped) {
      setUsers([]);
      setLoading(false);
      return () => controller.abort();
    }

    const run = async () => {
      try {
        setLoading(true);

        const res = await fetch(`/api/users/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        const json = await res.json();
        setUsers(Array.isArray(json?.users) ? json.users : []);
      } catch (err) {
        if (err?.name !== "AbortError") {
          setUsers([]);
        }
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(run, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [trimmed, hasTyped]);

  const resultsLabel = useMemo(() => {
    if (!hasTyped) return "Search Aurora profiles";
    if (loading) return "Searching profiles...";
    return `${users.length} result${users.length === 1 ? "" : "s"} found`;
  }, [hasTyped, loading, users.length]);

  return (
    <div className="w-full">
      <div className="rounded-[28px] border border-white/10 bg-black/30 p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur-2xl">
        <div className="flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-violet-500/20 text-cyan-300">
            <Search size={18} />
          </div>

          <div className="min-w-0 flex-1">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by username or collector name..."
              className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-white/30 sm:text-base"
            />
            <p className="mt-1 text-xs text-white/40">{resultsLabel}</p>
          </div>

          {hasTyped ? (
            <div className="hidden rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-white/55 sm:block">
              Live Search
            </div>
          ) : (
            <div className="hidden rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-white/55 sm:block">
              NFT Profiles
            </div>
          )}
        </div>
      </div>

      <div className="mt-5">
        {!hasTyped ? (
          <EmptyState hasTyped={false} />
        ) : loading ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 animate-pulse rounded-2xl bg-white/10" />
                  <div className="min-w-0 flex-1">
                    <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
                    <div className="mt-2 h-3 w-24 animate-pulse rounded bg-white/10" />
                    <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-white/10" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <EmptyState hasTyped />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {users.map((user) => (
              <Link
                key={user.id}
                href={`/u/${user.username}`}
                className="group overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/30 hover:bg-white/[0.06] hover:shadow-[0_0_40px_rgba(34,211,238,0.08)]"
              >
                <div className="flex items-start gap-4">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-400/15 to-violet-500/15">
                    {user.avatar_url ? (
                      <Image
                        src={user.avatar_url}
                        alt={user.display_name || user.username}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white/75">
                        {(user.display_name || user.username || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold text-white">
                          {user.display_name || user.username}
                        </div>
                        <div className="mt-1 truncate text-sm text-cyan-300/80">
                          @{user.username}
                        </div>
                      </div>

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/50 transition-colors group-hover:border-cyan-400/30 group-hover:text-cyan-300">
                        <ArrowUpRight size={16} />
                      </div>
                    </div>

                    {user.bio ? (
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/50">
                        {user.bio}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm text-white/35">
                        Public Aurora collector profile.
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/50">
                        <Sparkles size={11} />
                        Public Profile
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}