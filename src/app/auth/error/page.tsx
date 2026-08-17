import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";

export default function AuthErrorPage() {
  return <AuthShell title="That link no longer holds." description="Confirmation links are time-limited so your account stays protected.">
    <div><h2 className="text-xl font-semibold tracking-[-0.025em] text-ink">We couldn’t confirm your email</h2><p className="mt-3 text-sm leading-6 text-muted">The link may have expired or already been used. Try logging in first; if your email is still unconfirmed, return to signup to request a new message.</p><div className="mt-7 flex flex-wrap gap-5"><Link className="text-sm font-semibold text-coral underline decoration-coral/30 underline-offset-4 hover:decoration-coral" href="/login">Try logging in</Link><Link className="text-sm font-semibold text-ink underline decoration-line underline-offset-4 hover:decoration-ink" href="/signup">Return to signup</Link></div></div>
  </AuthShell>;
}

