import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { safeInternalPath } from "@/lib/auth/redirect";

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const candidate = (await searchParams).next;
  const next = typeof candidate === "string" ? safeInternalPath(candidate) : undefined;
  return <AuthShell>
    <div className="text-center"><h1 className="text-xl font-semibold tracking-[-0.025em] text-ink">Check your email</h1><p className="mt-3 text-sm leading-6 text-muted">Open the confirmation link we sent you to finish signing up.</p><Link className="mt-7 inline-flex min-h-11 items-center text-sm font-semibold text-coral underline underline-offset-4" href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>Return to login</Link></div>
  </AuthShell>;
}
