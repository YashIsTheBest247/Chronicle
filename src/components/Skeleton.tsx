/**
 * Loading placeholders shaped like the content they stand in for. A spinner
 * says "something is happening"; a skeleton says "a grid of record cards is
 * about to appear here", which stops the layout jumping when it does.
 */

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card space-y-3 p-5">
          <div className="skeleton h-5 w-28 rounded-full" />
          <div className="space-y-2">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-4/5" />
          </div>
          <div className="flex gap-1.5">
            <div className="skeleton h-5 w-16 rounded-full" />
            <div className="skeleton h-5 w-14 rounded-full" />
          </div>
          <div className="skeleton h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-8 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="card space-y-3 p-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="skeleton h-4 w-full" />
          ))}
        </div>
        <div className="card space-y-3 p-5">
          <div className="skeleton h-3 w-24" />
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="skeleton h-6 w-20 rounded-full" />
            ))}
          </div>
        </div>
      </div>
      <CardGridSkeleton />
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card space-y-2.5 p-4">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-5 w-2/3" />
          <div className="skeleton h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}
