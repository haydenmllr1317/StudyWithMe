import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";
import { Navigation } from "@/components/navigation/navigation";
import { TimezoneSync } from "@/components/timezone-sync";

export function AppShell({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh overflow-x-clip bg-paper"><TimezoneSync /><Navigation /><main className="min-w-0 pb-28 pt-8 sm:pt-10 lg:pb-16"><Container>{children}</Container></main></div>;
}
