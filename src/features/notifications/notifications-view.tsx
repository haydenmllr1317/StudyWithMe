"use client";

import Link from "next/link";
import { useEffect } from "react";
import { markNotificationsReadAction } from "@/app/notification-actions";
import type { NotificationItem } from "@/lib/notifications";

function relativeTime(value:string){
  const seconds=Math.round((new Date(value).getTime()-Date.now())/1000); const formatter=new Intl.RelativeTimeFormat("en",{numeric:"auto"});
  if(Math.abs(seconds)<60)return formatter.format(seconds,"second"); const minutes=Math.round(seconds/60);
  if(Math.abs(minutes)<60)return formatter.format(minutes,"minute"); const hours=Math.round(minutes/60);
  if(Math.abs(hours)<24)return formatter.format(hours,"hour"); return formatter.format(Math.round(hours/24),"day");
}

export function NotificationsView({items}:{items:NotificationItem[]}){
  useEffect(()=>{if(items.some((item)=>!item.read))void markNotificationsReadAction().then((result)=>{if(!result.error)window.dispatchEvent(new Event("study-notifications-read"))})},[items]);
  if(!items.length)return <div className="border-b border-line pb-9"><h2 className="text-lg font-semibold text-ink">All quiet for now.</h2><p className="mt-2 text-sm text-muted">When someone loves one of your shared study sessions, it will appear here.</p></div>;
  return <ol>{items.map((item)=><li className={`border-b border-line ${item.read?"":"bg-coral-soft/25"}`} key={item.id}><Link className="grid min-h-20 grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-4 sm:px-4" href={`/activity?scope=mine#session-${item.sessionId}`}><span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-coral-soft text-coral">♥</span><span className="min-w-0"><strong className="text-sm text-ink">{item.actorDisplayName}</strong><span className="text-sm text-muted"> loved your study session.</span><span className="mt-1 block text-xs text-muted">@{item.actorUsername}</span></span><span className="whitespace-nowrap text-xs text-muted" suppressHydrationWarning>{relativeTime(item.createdAt)}</span></Link></li>)}</ol>;
}
