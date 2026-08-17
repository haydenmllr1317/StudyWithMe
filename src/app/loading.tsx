export default function Loading() {
  return (
    <main className="min-h-dvh bg-paper px-5 pb-28 pt-[calc(2rem+env(safe-area-inset-top))] sm:px-8 sm:pt-10">
      <div aria-live="polite" className="mx-auto max-w-5xl border-y border-line py-8" role="status">
        <p className="measure-label">StudyWithMe</p>
        <p className="mt-3 text-sm text-muted">Loading your study space…</p>
      </div>
    </main>
  );
}
