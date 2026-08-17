import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";

export default function AuthErrorPage() {
  return <AuthShell>
    <div className="text-center"><h1 className="text-xl font-semibold tracking-[-0.025em] text-ink">Link unavailable</h1><p className="mt-3 text-sm leading-6 text-muted">It may have expired or already been used.</p><div className="mt-7 flex justify-center gap-5"><Link className="text-sm font-semibold text-coral underline underline-offset-4" href="/login">Log in</Link><Link className="text-sm font-semibold text-ink underline underline-offset-4" href="/signup">Sign up again</Link></div></div>
  </AuthShell>;
}
