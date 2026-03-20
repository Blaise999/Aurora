"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function PublicUserSearch() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        setUsers(json.users || []);
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(run, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [q]);

  return (
    <div className="w-full max-w-2xl">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search users by username or name..."
        className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none placeholder:text-zinc-500"
      />

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4 text-sm text-zinc-400">
            Searching...
          </div>
        ) : null}

        {!loading && users.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4 text-sm text-zinc-500">
            No users found.
          </div>
        ) : null}

        {!loading &&
          users.map((user) => (
            <Link
              key={user.id}
              href={`/u/${user.username}`}
              className="flex items-center gap-4 rounded-2xl border border-white/10 bg-zinc-950 p-4 transition hover:bg-white/5"
            >
              <div className="relative h-12 w-12 overflow-hidden rounded-full bg-zinc-900">
                {user.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={user.display_name || user.username}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center font-semibold text-zinc-500">
                    {(user.display_name || user.username || "U").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-white">
                  {user.display_name || user.username}
                </div>
                <div className="text-sm text-zinc-400">@{user.username}</div>
                {user.bio ? (
                  <div className="mt-1 truncate text-sm text-zinc-500">
                    {user.bio}
                  </div>
                ) : null}
              </div>
            </Link>
          ))}
      </div>
    </div>
  );
}