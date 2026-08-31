"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getUnreadNotificationCountAction } from "@/app/notification-actions";

export function NotificationBell({ initialUnreadCount }: { initialUnreadCount: number }) {
  const [count,setCount]=useState(initialUnreadCount);
  useEffect(()=>{
    let active=true;
    const refresh=()=>getUnreadNotificationCountAction().then((value)=>{if(active)setCount(value)});
    const timer=window.setInterval(refresh,30000);
    const onVisibility=()=>{if(document.visibilityState==="visible")void refresh()};
    const onRead=()=>setCount(0);
    document.addEventListener("visibilitychange",onVisibility);
    window.addEventListener("study-notifications-read",onRead);
    return()=>{active=false;window.clearInterval(timer);document.removeEventListener("visibilitychange",onVisibility);window.removeEventListener("study-notifications-read",onRead)};
  },[]);
  return <Link aria-label={count?`${count} unread ${count===1?"notification":"notifications"}`:"Notifications"} className="relative grid size-11 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-white hover:text-ink" href="/notifications">
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7"/></svg>
    {count>0&&<span aria-hidden="true" className="absolute right-1 top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-coral px-1 text-[0.625rem] font-semibold leading-4 text-white">{count>99?"99+":count}</span>}
  </Link>;
}
