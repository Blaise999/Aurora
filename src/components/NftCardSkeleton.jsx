"use client";

export default function NftCardSkeleton({ count = 4 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-card overflow-hidden bg-surface border border-border-light"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="aspect-[4/5] shimmer" />
          <div className="p-3 sm:p-4 space-y-2.5">
            <div className="h-4 w-3/4 rounded shimmer" />
            <div className="flex justify-between">
              <div className="h-3 w-16 rounded shimmer" />
              <div className="h-3 w-12 rounded shimmer" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
