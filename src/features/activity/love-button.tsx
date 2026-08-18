"use client";

import { useState } from "react";
import { getSessionLikersAction, toggleLoveAction } from "@/app/activity-actions";

export function LoveButton({ canLove = true, count, initiallyLoved, sessionId }: { canLove?: boolean; count: number; initiallyLoved: boolean; sessionId: string }) {
  const [loved, setLoved] = useState(initiallyLoved);
  const [loveCount, setLoveCount] = useState(count);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();
  const [showLikers, setShowLikers] = useState(false);
  const [likers, setLikers] = useState<Array<{ displayName: string; username: string }>>([]);
  const [loadingLikers, setLoadingLikers] = useState(false);
  async function toggle() {
    if (pending || !canLove) return;
    setPending(true); setMessage(undefined);
    const result = await toggleLoveAction(sessionId);
    if (result.error) setMessage(result.error);
    else if (typeof result.loved === "boolean") {
      setLoved(result.loved);
      setLoveCount((value)=>Math.max(0,value+(result.loved?1:-1)));
    }
    setPending(false);
  }
  async function openLikers() {
    setShowLikers((value) => !value);
    if (showLikers || loadingLikers) return;
    setLoadingLikers(true);
    const result = await getSessionLikersAction(sessionId);
    setLikers(result.likers);
    if (result.error) setMessage(result.error);
    setLoadingLikers(false);
  }
  return <div><div className="flex min-h-11 items-center gap-1"><button aria-label={canLove?(loved?"Remove love from this study session":"Love this study session"):"Your study session"} aria-pressed={canLove?loved:undefined} className={`inline-flex min-h-11 min-w-11 items-center justify-center px-2 ${loved?"text-coral":"text-muted hover:text-ink"}`} disabled={pending||!canLove} onClick={toggle} type="button"><svg aria-hidden="true" className="size-5" fill={loved?"currentColor":"none"} viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7"/></svg></button><button aria-expanded={showLikers} className="min-h-11 px-2 text-sm font-semibold text-muted underline decoration-line underline-offset-4 hover:text-ink" onClick={openLikers} type="button">{loveCount} {loveCount===1?"love":"loves"}</button></div>{showLikers&&<div className="mt-2 max-w-sm rounded-field border border-line bg-white px-4 py-3"><p className="text-xs font-semibold text-ink">Loved by</p>{loadingLikers?<p className="mt-2 text-xs text-muted">Loading…</p>:likers.length?<ul className="mt-2 space-y-2">{likers.map((person)=><li className="text-sm text-ink" key={person.username}>{person.displayName} <span className="text-xs text-muted">@{person.username}</span></li>)}</ul>:<p className="mt-2 text-xs text-muted">No loves yet.</p>}</div>}{message&&<p className="text-xs text-coral-dark" role="alert">{message}</p>}</div>;
}
