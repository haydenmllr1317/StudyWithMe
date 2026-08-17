import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/auth-forms";
import { safeInternalPath } from "@/lib/auth/redirect";
import { redirectIfAuthenticated } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await redirectIfAuthenticated();
  const candidate = (await searchParams).next;
  const next = typeof candidate === "string" ? safeInternalPath(candidate) : undefined;
  return <AuthShell title="Find your place in the session." description="Return to today’s focus, your recent work, and the small circle studying alongside you."><LoginForm next={next} /></AuthShell>;
}
