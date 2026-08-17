export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-slate-800 rounded-lg" />
          <div className="h-4 w-96 bg-slate-800 rounded-lg" />
        </div>
        <div className="h-10 w-48 bg-slate-800 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="h-3 w-28 bg-slate-800 rounded" />
            <div className="h-7 w-24 bg-slate-800 rounded" />
            <div className="h-3 w-32 bg-slate-800 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map(i => (
          <div key={i} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="h-5 w-48 bg-slate-800 rounded" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(j => (
                <div key={j} className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                  <div className="h-6 w-6 bg-slate-700 rounded" />
                  <div className="h-4 w-24 bg-slate-700 rounded" />
                  <div className="h-3 w-32 bg-slate-700 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
