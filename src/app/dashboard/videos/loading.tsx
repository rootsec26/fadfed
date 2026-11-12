export default function VideosLoading() {
  return (
    <div className="space-y-4">
      <div className="h-9 w-48 animate-pulse rounded-2xl bg-sand-200" />
      <div className="grid gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-3xl border border-sand-200 bg-white p-4">
            <div className="h-12 w-20 animate-pulse rounded-xl bg-sand-100" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 animate-pulse rounded-full bg-sand-100" />
              <div className="h-3 w-1/4 animate-pulse rounded-full bg-sand-100" />
            </div>
            <div className="h-6 w-16 animate-pulse rounded-full bg-sand-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
