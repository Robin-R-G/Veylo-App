export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-surface-container-high rounded-lg" />
          <div className="h-4 w-96 bg-surface-container-high rounded-lg" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-32 bg-surface-container-high rounded-lg" />
          <div className="h-10 w-36 bg-surface-container-high rounded-lg" />
        </div>
      </div>

      <div className="bg-surface rounded-2xl p-6 border border-outline-variant space-y-4">
        <div className="h-5 w-48 bg-surface-container-high rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-4 rounded-xl bg-surface-container-low border border-outline-variant space-y-2">
              <div className="h-3 w-24 bg-surface-container-high rounded" />
              <div className="h-7 w-20 bg-surface-container-high rounded" />
              <div className="h-3 w-28 bg-surface-container-high rounded" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-4 bg-surface p-6 rounded-xl border border-outline-variant space-y-3">
          <div className="h-4 w-32 bg-surface-container-high rounded" />
          <div className="h-8 w-16 bg-surface-container-high rounded" />
        </div>
        <div className="col-span-4 bg-surface p-6 rounded-xl border border-outline-variant space-y-3">
          <div className="h-4 w-40 bg-surface-container-high rounded" />
          <div className="h-8 w-24 bg-surface-container-high rounded" />
        </div>
        <div className="col-span-4 bg-surface p-6 rounded-xl border border-outline-variant space-y-3">
          <div className="h-4 w-28 bg-surface-container-high rounded" />
          <div className="h-8 w-20 bg-surface-container-high rounded" />
        </div>
        <div className="col-span-8 bg-surface p-6 rounded-xl border border-outline-variant space-y-4">
          <div className="h-5 w-40 bg-surface-container-high rounded" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2].map(i => (
              <div key={i} className="p-4 rounded-xl bg-surface-container-low border border-outline-variant space-y-3">
                <div className="h-5 w-32 bg-surface-container-high rounded" />
                <div className="h-4 w-40 bg-surface-container-high rounded" />
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-4 bg-surface p-6 rounded-xl border border-outline-variant space-y-4">
          <div className="h-5 w-36 bg-surface-container-high rounded" />
          {[1, 2, 3].map(i => (
            <div key={i} className="p-3 rounded-lg bg-surface-container-low border border-outline-variant space-y-2">
              <div className="flex justify-between">
                <div className="h-4 w-20 bg-surface-container-high rounded" />
                <div className="h-4 w-16 bg-surface-container-high rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
