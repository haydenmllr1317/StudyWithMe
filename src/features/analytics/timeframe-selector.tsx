import Link from "next/link";
import { analyticsRangeLabel, analyticsRanges, type AnalyticsRange } from "@/lib/analytics";

export function TimeframeSelector({ range, hrefFor }: { range: AnalyticsRange; hrefFor: (range: AnalyticsRange) => string }) {
  return <nav aria-label="Analytics timeframe" className="flex snap-x overflow-x-auto border-b border-line">
    {analyticsRanges.map((item) => <Link aria-current={item === range ? "page" : undefined} className={`relative min-h-11 min-w-max snap-start px-3 py-3 text-sm font-semibold sm:px-4 ${item === range ? "text-ink" : "text-muted"}`} href={hrefFor(item)} key={item}>{analyticsRangeLabel(item)}{item === range && <span aria-hidden="true" className="absolute inset-x-2 bottom-[-1px] h-0.5 bg-coral" />}</Link>)}
  </nav>;
}
