export default function VehiclesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-surface-container-high rounded-lg" />
          <div className="h-4 w-80 bg-surface-container-high rounded-lg" />
        </div>
        <div className="h-10 w-40 bg-surface-container-high rounded-lg" />
      </div>
      <div className="flex gap-3">
        <div className="h-10 w-64 bg-surface-container-high rounded-lg" />
        <div className="h-10 w-32 bg-surface-container-high rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-5 rounded-xl bg-surface border border-outline-variant space-y-3">
            <div className="flex justify-between">
              <div className="h-5 w-32 bg-surface-container-high rounded" />
              <div className="h-5 w-16 bg-surface-container-high rounded-full" />
            </div>
            <div className="h-4 w-40 bg-surface-container-high rounded" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-12 bg-surface-container-high rounded" />
              <div className="h-12 bg-surface-container-high rounded" />
            </div>
            <div className="h-8 bg-surface-container-high rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
