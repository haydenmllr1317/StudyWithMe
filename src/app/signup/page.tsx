import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/auth-forms";
import { redirectIfAuthenticated } from "@/lib/auth/session";
import { safeInternalPath } from "@/lib/auth/redirect";

export const dynamic = "force-dynamic";

export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await redirectIfAuthenticated();
  const candidate = (await searchParams).next;
  const next = typeof candidate === "string" ? safeInternalPath(candidate) : undefined;
  return <AuthShell><SignupForm next={next} /></AuthShell>;
}
