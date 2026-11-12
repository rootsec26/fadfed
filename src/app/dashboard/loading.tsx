export default function AdminLoading() {
  return (
    <div className="space-y-4">
      <div className="h-9 w-56 animate-pulse rounded-2xl bg-sand-200" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-3xl bg-white" />
        ))}
      </div>
    </div>
  );
}
