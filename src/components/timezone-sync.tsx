"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { syncTimezoneAction } from "@/app/timezone-actions";

export function TimezoneSync() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timezone) return;
    void syncTimezoneAction(timezone).then((changed) => {
      if (active && changed) router.refresh();
    });
    return () => { active = false; };
  }, [router]);

  return null;
}
