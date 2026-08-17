import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/auth-forms";
import { redirectIfAuthenticated } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  await redirectIfAuthenticated();
  return <AuthShell title="Begin with one focused hour." description="Create a quiet place for your study time, personal consistency, and eventually the people you choose to study with."><SignupForm /></AuthShell>;
}

