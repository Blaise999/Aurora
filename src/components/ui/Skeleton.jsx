export default function Skeleton({ className = '', variant = 'rect' }) {
  const base = 'skeleton-pulse rounded-card';
  const variants = {
    rect: '',
    circle: '!rounded-full',
    text: '!rounded-lg h-4',
    title: '!rounded-lg h-6 w-3/4',
    card: 'aspect-square',
  };
  return <div className={`${base} ${variants[variant]} ${className}`} />;
}

export function NFTCardSkeleton() {
  return (
    <div className="rounded-card overflow-hidden bg-surface2/40 border border-border-light">
      <Skeleton className="aspect-square w-full !rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton variant="text" className="w-1/3" />
        <Skeleton variant="title" />
        <div className="flex justify-between pt-2">
          <Skeleton variant="text" className="w-1/4" />
          <Skeleton variant="text" className="w-1/4" />
        </div>
      </div>
    </div>
  );
}
