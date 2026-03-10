export default function MintLoading() {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="h-4 w-48 rounded shimmer mb-6" />
        <div className="grid lg:grid-cols-5 gap-6 lg:gap-10">
          <div className="lg:col-span-3 space-y-6">
            <div className="aspect-square rounded-card shimmer" />
            <div className="rounded-card bg-surface2 border border-border-light p-6 space-y-3">
              <div className="h-8 w-2/3 rounded shimmer" />
              <div className="h-4 w-full rounded shimmer" />
              <div className="h-4 w-3/4 rounded shimmer" />
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="rounded-card bg-surface2 border border-border-light p-6 space-y-4">
              <div className="h-6 w-1/2 rounded shimmer" />
              <div className="h-32 rounded-xl shimmer" />
              <div className="h-12 rounded-pill shimmer" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
