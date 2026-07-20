export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center pt-24">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-electric-blue/20 border-t-electric-blue" />
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    </div>
  )
}
