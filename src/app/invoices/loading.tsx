export default function InvoicesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-surface-container-high rounded-lg" />
          <div className="h-4 w-64 bg-surface-container-high rounded-lg" />
        </div>
      </div>
      <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant">
          <div className="h-5 w-40 bg-surface-container-high rounded" />
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="px-6 py-4 flex items-center justify-between border-b border-outline-variant last:border-0">
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 bg-surface-container-high rounded-lg" />
              <div className="space-y-1">
                <div className="h-4 w-32 bg-surface-container-high rounded" />
                <div className="h-3 w-24 bg-surface-container-high rounded" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-4 w-20 bg-surface-container-high rounded" />
              <div className="h-5 w-16 bg-surface-container-high rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
