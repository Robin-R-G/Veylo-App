export default function EstimatorLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
      <div className="h-7 w-64 bg-surface-container-high rounded-lg" />
      <div className="bg-surface rounded-xl p-6 border border-outline-variant space-y-6">
        <div className="space-y-2">
          <div className="h-4 w-40 bg-surface-container-high rounded" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-surface-container-high rounded-xl" />)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="h-4 w-36 bg-surface-container-high rounded" />
            <div className="h-10 bg-surface-container-high rounded-lg" />
          </div>
          <div className="space-y-1">
            <div className="h-4 w-36 bg-surface-container-high rounded" />
            <div className="h-10 bg-surface-container-high rounded-lg" />
          </div>
        </div>
        <div className="h-40 bg-surface-container-high rounded-xl" />
      </div>
    </div>
  );
}
