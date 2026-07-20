export default function DashboardLoading() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton mt-3 h-4 w-48" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card">
            <div className="skeleton h-4 w-20" />
            <div className="skeleton mt-3 h-7 w-12" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="card space-y-4">
            <div className="skeleton h-5 w-32" />
            <div className="skeleton h-16 w-full" />
            <div className="skeleton h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}
