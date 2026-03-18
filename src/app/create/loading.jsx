export default function CreateLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-2 border-accent-violet border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted font-display">Loading creator studio...</p>
      </div>
    </div>
  );
}
