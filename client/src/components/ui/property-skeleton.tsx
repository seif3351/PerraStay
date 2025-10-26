export function PropertySkeleton() {
  return (
    <div className="animate-pulse space-y-4 rounded-lg border p-6">
      <div className="h-48 bg-gray-200 rounded-lg w-full"></div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>
    </div>
  );
}

export function PropertiesGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }, (_, i) => (
        <PropertySkeleton key={i} />
      ))}
    </div>
  );
}