import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";

export function AuthShell({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return <main className="min-h-dvh bg-paper">
    <Container className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center border-b border-line">
        <Link className="text-sm font-semibold tracking-[-0.035em] text-ink" href="/login">StudyWithMe<span className="text-coral">.</span></Link>
      </header>
      <div className="grid flex-1 py-10 md:grid-cols-[minmax(0,0.8fr)_minmax(22rem,0.65fr)] md:items-center md:gap-16 lg:gap-24">
        <section className="border-b border-line pb-8 md:border-b-0 md:border-r md:pb-0 md:pr-16">
          <p className="measure-label">A shared rhythm for focused work</p>
          <h1 className="mt-4 max-w-lg text-4xl font-semibold tracking-[-0.035em] text-ink sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-muted sm:text-base">{description}</p>
        </section>
        <section className="pt-8 md:pt-0">{children}</section>
      </div>
    </Container>
  </main>;
}

