"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, signupAction } from "@/app/auth-actions";
import { initialAuthState, type AuthField } from "@/lib/auth/validation";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return <button className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-field bg-coral px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-coral-dark disabled:cursor-wait disabled:bg-coral/70" disabled={pending} type="submit">{pending ? pendingLabel : label}</button>;
}

function Field({
  autoComplete,
  description,
  error,
  label,
  maxLength,
  minLength,
  name,
  pattern,
  type = "text",
}: {
  autoComplete: string;
  description?: string;
  error?: string;
  label: string;
  maxLength?: number;
  minLength?: number;
  name: AuthField;
  pattern?: string;
  type?: string;
}) {
  const errorId = `${name}-error`;
  const descriptionId = `${name}-description`;
  return <label className="block text-sm font-semibold text-ink">{label}
    <input aria-describedby={[description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined} aria-invalid={Boolean(error)} autoCapitalize={name === "username" || name === "email" ? "none" : undefined} autoComplete={autoComplete} className="field mt-2" maxLength={maxLength} minLength={minLength} name={name} pattern={pattern} required type={type} />
    {description && <span className="mt-1.5 block text-xs font-normal leading-5 text-muted" id={descriptionId}>{description}</span>}
    {error && <span className="mt-2 block text-xs leading-5 text-coral-dark" id={errorId}>{error}</span>}
  </label>;
}

function FormMessage({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="border-y border-coral-soft bg-coral-soft/35 px-3 py-3 text-sm leading-5 text-coral-dark" role="alert">{message}</p>;
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, initialAuthState);
  return <div>
    <form action={action} className="space-y-5" noValidate>
      {next && <input name="next" type="hidden" value={next} />}
      <FormMessage message={state.message} />
      <Field autoComplete="email" error={state.fieldErrors?.email} label="Email" name="email" type="email" />
      <Field autoComplete="current-password" error={state.fieldErrors?.password} label="Password" name="password" type="password" />
      <SubmitButton label="Log in" pendingLabel="Logging in…" />
    </form>
    <p className="mt-7 text-center text-sm text-muted">No account? <Link className="font-semibold text-coral underline decoration-coral/30 underline-offset-4 hover:decoration-coral" href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}>Sign up</Link></p>
  </div>;
}

export function SignupForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signupAction, initialAuthState);
  return <div>
    <form action={action} className="space-y-5" noValidate>
      {next && <input name="next" type="hidden" value={next} />}
      <FormMessage message={state.message} />
      <Field autoComplete="name" error={state.fieldErrors?.displayName} label="Display name" maxLength={80} name="displayName" />
      <Field autoComplete="username" description="3–30 lowercase letters, numbers, or underscores." error={state.fieldErrors?.username} label="Username" maxLength={30} minLength={3} name="username" pattern="[a-z0-9][a-z0-9_]{2,29}" />
      <Field autoComplete="email" error={state.fieldErrors?.email} label="Email" name="email" type="email" />
      <Field autoComplete="new-password" description="At least 8 characters." error={state.fieldErrors?.password} label="Password" minLength={8} name="password" type="password" />
      <SubmitButton label="Create account" pendingLabel="Creating account…" />
    </form>
    <p className="mt-7 text-center text-sm text-muted">Have an account? <Link className="font-semibold text-coral underline decoration-coral/30 underline-offset-4 hover:decoration-coral" href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>Log in</Link></p>
  </div>;
}
