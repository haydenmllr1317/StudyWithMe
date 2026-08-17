"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Route rendering failed", error); }, [error]);
  return (
    <main className="min-h-dvh bg-paper px-5 pb-28 pt-[calc(2rem+env(safe-area-inset-top))] sm:px-8 sm:pt-10">
      <div className="mx-auto max-w-5xl border-y border-line py-8" role="alert">
        <p className="measure-label">Something interrupted the page</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-ink">We couldn’t load this view.</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">Check your connection and try again. Your saved study data has not been changed.</p>
        <Button className="mt-6" onClick={reset}>Try again</Button>
      </div>
    </main>
  );
}
