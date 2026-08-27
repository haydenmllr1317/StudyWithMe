export default function ApplicationLoading() {
  return <div aria-busy="true" aria-label="Loading page" className="space-y-9">
    <div className="h-9 w-36 animate-pulse bg-line motion-reduce:animate-none" />
    <div className="space-y-4 border-t border-line pt-6">
      <div className="h-4 w-2/3 max-w-lg animate-pulse bg-line motion-reduce:animate-none" />
      <div className="h-4 w-1/2 max-w-sm animate-pulse bg-line motion-reduce:animate-none" />
      <span className="sr-only">Loading…</span>
    </div>
  </div>;
}
