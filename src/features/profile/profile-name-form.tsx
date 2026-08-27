"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveProfileNamesAction, type ProfileActionState } from "@/app/profile-actions";
import { Button } from "@/components/ui/button";

const initialState: ProfileActionState = { status: "idle" };

function SaveButton() {
  const { pending } = useFormStatus();
  return <Button disabled={pending} type="submit">{pending ? "Saving…" : "Save profile"}</Button>;
}

export function ProfileNameForm({ displayName, username }: { displayName: string; username: string }) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState(saveProfileNamesAction, initialState);

  if (!editing) return <div className="mt-4 flex items-center gap-4">
    <button className="min-h-10 text-sm font-semibold text-coral underline decoration-coral/30 underline-offset-4 hover:decoration-coral" onClick={() => setEditing(true)} type="button">Edit name and username</button>
    {state.status === "success" && <span className="text-xs text-moss-dark" role="status">{state.message}</span>}
  </div>;

  return <form action={action} className="mt-5 border-y border-line bg-white/60 px-4 py-5 sm:px-6" noValidate>
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="text-sm font-semibold text-ink">Display name
        <input aria-describedby={state.fieldErrors?.displayName ? "profile-display-name-error" : undefined} aria-invalid={Boolean(state.fieldErrors?.displayName)} autoComplete="name" className="field mt-2" defaultValue={state.profile?.display_name ?? displayName} maxLength={80} name="displayName" required />
        {state.fieldErrors?.displayName && <span className="mt-1.5 block text-xs font-normal leading-5 text-coral-dark" id="profile-display-name-error">{state.fieldErrors.displayName}</span>}
      </label>
      <label className="text-sm font-semibold text-ink">Username
        <input aria-describedby="profile-username-description" aria-invalid={Boolean(state.fieldErrors?.username)} autoCapitalize="none" autoComplete="username" className="field mt-2" defaultValue={state.profile?.username ?? username} maxLength={30} minLength={3} name="username" pattern="[a-z0-9][a-z0-9_]{2,29}" required />
        <span className="mt-1.5 block text-xs font-normal leading-5 text-muted" id="profile-username-description">3–30 lowercase letters, numbers, or underscores.</span>
        {state.fieldErrors?.username && <span className="mt-1 block text-xs font-normal leading-5 text-coral-dark">{state.fieldErrors.username}</span>}
      </label>
    </div>
    {state.message && <p className={`mt-4 text-sm ${state.status === "error" ? "text-coral-dark" : "text-moss-dark"}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p>}
    <div className="mt-6 flex flex-wrap items-center gap-4"><SaveButton /><button className="min-h-10 text-sm font-semibold text-muted hover:text-ink" onClick={() => setEditing(false)} type="button">Cancel</button></div>
  </form>;
}
