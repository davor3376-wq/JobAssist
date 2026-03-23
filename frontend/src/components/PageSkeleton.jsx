/** Reusable skeleton components for consistent loading states across pages. */

export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
      <div className="h-5 w-36 bg-gray-200 rounded mb-4" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-100 rounded mb-3" style={{ width: `${85 - i * 15}%` }} />
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-200 rounded-lg flex-shrink-0" />
          <div className="flex-1">
            <div className="h-4 w-40 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-24 bg-gray-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({ fields = 4 }) {
  return (
    <div className="space-y-6 animate-pulse">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i}>
          <div className="h-4 w-28 bg-gray-200 rounded mb-2" />
          <div className="h-10 bg-gray-100 rounded-xl" />
        </div>
      ))}
      <div className="h-10 w-36 bg-gray-200 rounded-xl" />
    </div>
  );
}
