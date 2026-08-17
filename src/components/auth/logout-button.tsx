"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { logoutAction } from "@/app/auth-actions";
import { initialAuthState } from "@/lib/auth/validation";

function LogoutSubmit() {
  const { pending } = useFormStatus();
  return <button className="min-h-11 border border-ink px-4 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-white disabled:cursor-wait disabled:border-line disabled:text-muted" disabled={pending} type="submit">{pending ? "Signing out…" : "Log out"}</button>;
}

export function LogoutButton() {
  const [state, action] = useActionState(logoutAction, initialAuthState);
  return <form action={action} className="flex flex-col items-start gap-3">
    <LogoutSubmit />
    {state.message && <p className="text-xs leading-5 text-coral-dark" role="alert">{state.message}</p>}
  </form>;
}

