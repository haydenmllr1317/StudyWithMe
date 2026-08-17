import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";

export function AuthShell({
  children,
}: {
  children: ReactNode;
}) {
  return <main className="min-h-dvh bg-paper">
    <Container className="flex min-h-dvh max-w-md flex-col justify-center py-10">
      <header className="mb-10 text-center">
        <Link className="inline-flex min-h-11 items-center text-lg font-semibold tracking-[-0.035em] text-ink" href="/login">StudyWithMe<span className="text-coral">.</span></Link>
      </header>
      <section>{children}</section>
    </Container>
  </main>;
}
