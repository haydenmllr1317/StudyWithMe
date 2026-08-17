import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";

export default function CheckEmailPage() {
  return <AuthShell title="Your next measure is in your inbox." description="Email confirmation protects your account before your StudyWithMe profile becomes active.">
    <div><h2 className="text-xl font-semibold tracking-[-0.025em] text-ink">Check your email</h2><p className="mt-3 text-sm leading-6 text-muted">Open the confirmation message from StudyWithMe on this device. Once confirmed, you’ll return to Today with your session securely stored.</p><p className="mt-6 border-y border-line py-4 text-xs leading-5 text-muted">The link can expire. If it does, return to signup and submit your details again.</p><Link className="mt-6 inline-flex min-h-12 items-center text-sm font-semibold text-coral underline decoration-coral/30 underline-offset-4 hover:decoration-coral" href="/login">Return to login</Link></div>
  </AuthShell>;
}

