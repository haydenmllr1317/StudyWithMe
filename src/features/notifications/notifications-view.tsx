"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markNotificationReadAction } from "@/app/notification-actions";
import { Button } from "@/components/ui/button";
import type { NotificationItem } from "@/lib/notifications";

export function NotificationsView({ initialItems }: { initialItems: NotificationItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [pending, setPending] = useState<string>();
  const [error, setError] = useState<string>();
  async function open(item: NotificationItem) {
    setPending(item.id); setError(undefined);
    const result = await markNotificationReadAction(item.id);
    if (result.error) { setError(result.error); setPending(undefined); return; }
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry));
    router.push(`/activity?scope=mine#session-${item.sessionId}`);
  }
  async function markAll() {
    setPending("all"); setError(undefined);
    const result = await markNotificationReadAction();
    if (result.error) setError(result.error);
    else { setItems((current) => current.map((item) => ({ ...item, read: true }))); router.refresh(); }
    setPending(undefined);
  }
  if (!items.length) return <div className="border-y border-line py-9"><h2 className="text-lg font-semibold text-ink">No notifications yet.</h2><p className="mt-2 text-sm text-muted">When someone loves one of your sessions, you’ll see it here.</p></div>;
  return <section><div className="flex justify-end"><Button disabled={pending === "all" || !items.some((item) => !item.read)} onClick={markAll}>{pending === "all" ? "Updating…" : "Mark all read"}</Button></div><ol className="mt-5 border-t border-line">{items.map((item)=><li className={`border-b border-line ${item.read ? "" : "bg-coral-soft/25"}`} key={item.id}><button className="flex min-h-20 w-full items-center justify-between gap-5 px-3 py-4 text-left" disabled={pending===item.id} onClick={()=>open(item)} type="button"><span><strong className="text-sm text-ink">{item.actorDisplayName}</strong><span className="text-sm text-muted"> liked your study session.</span><span className="mt-1 block text-xs text-muted">@{item.actorUsername} · {new Intl.DateTimeFormat("en-US",{dateStyle:"medium",timeStyle:"short"}).format(new Date(item.createdAt))}</span></span>{!item.read&&<span className="size-2 shrink-0 rounded-full bg-coral"><span className="sr-only">Unread</span></span>}</button></li>)}</ol>{error&&<p className="mt-3 text-sm text-coral-dark" role="alert">{error}</p>}</section>;
}
