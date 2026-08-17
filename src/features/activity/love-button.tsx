"use client";

import { useState } from "react";
import { toggleLoveAction } from "@/app/activity-actions";

export function LoveButton({ count, initiallyLoved, sessionId }: { count: number; initiallyLoved: boolean; sessionId: string }) {
  const [loved, setLoved] = useState(initiallyLoved);
  const [loveCount, setLoveCount] = useState(count);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();
  async function toggle() {
    if (pending) return;
    setPending(true); setMessage(undefined);
    const result = await toggleLoveAction(sessionId);
    if (result.error) setMessage(result.error);
    else if (typeof result.loved === "boolean") {
      setLoved(result.loved);
      setLoveCount((value)=>Math.max(0,value+(result.loved?1:-1)));
    }
    setPending(false);
  }
  return <div><button aria-label={`${loved?"Remove love from":"Love"} this study session. ${loveCount} ${loveCount===1?"love":"loves"}.`} aria-pressed={loved} className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 px-2 text-sm font-semibold ${loved?"text-coral":"text-muted hover:text-ink"}`} disabled={pending} onClick={toggle} type="button"><svg aria-hidden="true" className="size-5" fill={loved?"currentColor":"none"} viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7"/></svg><span>{loveCount}</span></button>{message&&<p className="text-xs text-coral-dark" role="alert">{message}</p>}</div>;
}
