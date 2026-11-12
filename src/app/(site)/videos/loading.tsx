export default function VideosLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      {/* Hero skeleton */}
      <div className="bg-gradient-to-b from-brand-50 to-sand-50 px-5 pb-9 pt-12 sm:pb-11 sm:pt-16">
        <div className="mx-auto max-w-3xl">
          <div className="mx-auto h-9 w-40 animate-pulse rounded-full bg-brand-100" />
          <div className="mx-auto mt-4 h-1 w-14 animate-pulse rounded-full bg-sand-200" />
          <div className="mx-auto mt-4 h-5 w-2/3 max-w-md animate-pulse rounded-full bg-sand-100" />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:pt-10">
        {/* Chip skeletons */}
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-sand-100" />
          ))}
        </div>

        {/* Featured card skeleton */}
        <div className="mt-8 grid gap-0 overflow-hidden rounded-3xl border border-sand-200/80 bg-white shadow-sm md:grid-cols-[1.15fr_1fr]">
          <div className="m-3 aspect-video animate-pulse rounded-2xl bg-sand-100 sm:m-4 md:m-5" />
          <div className="space-y-3 p-5 pe-6 sm:p-7 md:py-8">
            <div className="h-6 w-24 animate-pulse rounded-full bg-brand-100" />
            <div className="h-7 w-3/4 animate-pulse rounded-full bg-sand-100" />
            <div className="h-4 w-full animate-pulse rounded-full bg-sand-100" />
            <div className="h-4 w-2/3 animate-pulse rounded-full bg-sand-100" />
            <div className="h-10 w-32 animate-pulse rounded-full bg-brand-100" />
          </div>
        </div>

        {/* Grid skeletons */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-3xl border border-sand-200/80 bg-white shadow-sm">
              <div className="m-3 aspect-video animate-pulse rounded-2xl bg-sand-100 sm:m-4" />
              <div className="space-y-2.5 p-4 sm:p-5">
                <div className="h-5 w-4/5 animate-pulse rounded-full bg-sand-100" />
                <div className="h-4 w-full animate-pulse rounded-full bg-sand-100/70" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
