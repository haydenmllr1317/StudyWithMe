"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container } from "@/components/layout/container";
import { NotificationBell } from "@/features/notifications/notification-bell";

const items = [
  { label: "Today", mobileLabel: "Today", href: "/today" },
  { label: "Activity", mobileLabel: "Activity", href: "/activity" },
  { label: "History", mobileLabel: "History", href: "/history" },
  { label: "Circle", mobileLabel: "Circle", href: "/leaderboard" },
  { label: "Profile", mobileLabel: "Profile", href: "/profile" },
] as const;

export function Navigation({ unreadNotificationCount = 0 }: { unreadNotificationCount?: number }) {
  const pathname = usePathname();
  return <>
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
      <Container className="flex h-16 items-center justify-between">
        <Link className="text-sm font-semibold tracking-[-0.035em] text-ink" href="/today">
          StudyWithMe<span className="text-coral">.</span>
        </Link>
        <div className="flex h-full items-center gap-4 lg:gap-5"><nav aria-label="Primary" className="hidden h-full items-center gap-6 md:flex lg:gap-8">{items.map((item) => {
          const active = pathname === item.href || (item.href === "/leaderboard" && pathname.startsWith("/groups/"));
          return <Link aria-current={active ? "page" : undefined} className={`relative flex h-full items-center text-sm transition-colors ${active ? "font-semibold text-ink" : "font-medium text-muted hover:text-ink"}`} href={item.href} key={item.href}>{item.label}{active && <span className="absolute bottom-[0.9rem] left-1/2 size-1 -translate-x-1/2 rounded-full bg-coral" />}</Link>;
        })}</nav><NotificationBell initialUnreadCount={unreadNotificationCount}/></div>
      </Container>
    </header>
    <nav aria-label="Primary mobile" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 px-1">{items.map((item) => {
        const active = pathname === item.href || (item.href === "/leaderboard" && pathname.startsWith("/groups/"));
        return <Link aria-current={active ? "page" : undefined} className={`relative flex min-h-16 items-center justify-center text-xs transition-colors ${active ? "font-semibold text-ink" : "font-medium text-muted"}`} href={item.href} key={item.href}>{active && <span className="absolute top-2 size-1 rounded-full bg-coral" />}{item.mobileLabel}</Link>;
      })}</div>
    </nav>
  </>;
}
