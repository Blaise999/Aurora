export default function ExploreLoading() {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8 sm:mb-12">
          <div className="h-3 w-24 rounded shimmer mb-3" />
          <div className="h-10 w-64 rounded shimmer mb-4" />
          <div className="h-4 w-96 rounded shimmer" />
        </div>
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-24 rounded-pill shimmer" />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="rounded-card overflow-hidden bg-surface border border-border-light">
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
        </div>
      </div>
    </div>
  );
}
