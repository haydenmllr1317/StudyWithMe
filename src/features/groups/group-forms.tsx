"use client";

import { useActionState, useState } from "react";
import {
  createGroupAction,
  deleteGroupAction,
  joinGroupAction,
  leaveGroupAction,
  regenerateInviteAction,
  removeMemberAction,
  renameGroupAction,
  type GroupActionState,
} from "@/app/group-actions";
import { Button } from "@/components/ui/button";

const initial: GroupActionState = { status: "idle" };

function Status({ state }: { state: GroupActionState }) {
  return state.message ? <p className="mt-2 text-sm text-coral-dark" role="alert">{state.message}</p> : null;
}

export function CreateGroupForm() {
  const [state, action, pending] = useActionState(createGroupAction, initial);
  return <form action={action} className="grid gap-3 sm:grid-cols-[1fr_auto]">
    <label className="text-sm font-semibold text-ink">Circle name<input className="field mt-2" maxLength={100} name="name" required /></label>
    <Button className="self-end" disabled={pending} type="submit">{pending ? "Creating…" : "Create Circle"}</Button>
    <Status state={state} />
  </form>;
}

export function JoinGroupForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(joinGroupAction, initial);
  return <form action={action}>
    <input name="token" type="hidden" value={token} />
    <Button disabled={pending} type="submit">{pending ? "Joining…" : "Join this Circle"}</Button>
    <Status state={state} />
  </form>;
}

export function OwnerGroupControls({ groupId, name, inviteUrl, members }: {
  groupId: string;
  name: string;
  inviteUrl: string;
  members: Array<{ username: string; displayName: string; role: string }>;
}) {
  const [rename, renameAction, renaming] = useActionState(renameGroupAction, initial);
  const [regen, regenAction, regenerating] = useActionState(regenerateInviteAction, initial);
  const [remove, removeAction, removing] = useActionState(removeMemberAction, initial);
  const [del, deleteAction, deleting] = useActionState(deleteGroupAction, initial);
  const [confirm, setConfirm] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const invitePath = new URL(inviteUrl).pathname;

  async function copyInvite() {
    try {
      const currentOriginUrl = new URL(invitePath, window.location.origin).toString();
      await navigator.clipboard.writeText(currentOriginUrl);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  return <div className="space-y-7">
    <div>
      <h2 className="text-lg font-semibold text-ink">Invite someone</h2>
      <p className="mt-1 text-sm text-muted">Only you can see and regenerate this link.</p>
      <div className="mt-3 flex gap-2">
        <input aria-label="Invite path" className="field min-w-0" readOnly value={invitePath} />
        <button className="min-h-11 shrink-0 text-sm font-semibold text-coral underline underline-offset-4" onClick={copyInvite} type="button">{copyState === "copied" ? "Copied" : "Copy link"}</button>
      </div>
      <span aria-live="polite" className={copyState === "error" ? "mt-2 block text-xs text-coral-dark" : "sr-only"}>{copyState === "copied" ? "Invite link copied" : copyState === "error" ? "Copy failed. Select the invite path and copy it manually." : ""}</span>
      <form action={regenAction} className="mt-3">
        <input name="groupId" type="hidden" value={groupId} />
        <button className="min-h-11 text-xs text-muted underline underline-offset-4 disabled:cursor-wait" disabled={regenerating} type="submit">{regenerating ? "Regenerating…" : "Regenerate link"}</button>
        <Status state={regen} />
      </form>
    </div>
    <form action={renameAction}>
      <input name="groupId" type="hidden" value={groupId} />
      <label className="text-sm font-semibold text-ink">Rename Circle<input className="field mt-2" defaultValue={name} maxLength={100} name="name" required /></label>
      <Button className="mt-3" disabled={renaming} type="submit">{renaming ? "Saving…" : "Save name"}</Button>
      <Status state={rename} />
    </form>
    {members.some((member) => member.role === "member") && <form action={removeAction}>
      <input name="groupId" type="hidden" value={groupId} />
      <label className="text-sm font-semibold text-ink">Remove a member<select className="field mt-2" name="username">{members.filter((member) => member.role === "member").map((member) => <option key={member.username} value={member.username}>{member.displayName} (@{member.username})</option>)}</select></label>
      <Button className="mt-3" disabled={removing} type="submit">{removing ? "Removing…" : "Remove member"}</Button>
      <Status state={remove} />
    </form>}
    <div className="border-t border-line pt-5">{confirm ? <form action={deleteAction}>
      <input name="groupId" type="hidden" value={groupId} />
      <p className="text-sm text-coral-dark">Delete this Circle and all memberships? Study sessions and goals will remain untouched.</p>
      <div className="mt-3 flex gap-4"><Button disabled={deleting} type="submit">{deleting ? "Deleting…" : "Delete Circle"}</Button><button className="min-h-11" disabled={deleting} onClick={() => setConfirm(false)} type="button">Cancel</button></div>
      <Status state={del} />
    </form> : <button className="min-h-11 text-sm text-muted underline underline-offset-4" onClick={() => setConfirm(true)} type="button">Delete Circle</button>}</div>
  </div>;
}

export function LeaveGroupForm({ groupId }: { groupId: string }) {
  const [state, action, pending] = useActionState(leaveGroupAction, initial);
  const [confirm, setConfirm] = useState(false);
  return confirm ? <form action={action}>
    <input name="groupId" type="hidden" value={groupId} />
    <p className="text-sm text-muted">Leave this Circle? Your study history will not be deleted.</p>
    <div className="mt-3 flex gap-4"><Button disabled={pending} type="submit">{pending ? "Leaving…" : "Leave Circle"}</Button><button className="min-h-11" disabled={pending} onClick={() => setConfirm(false)} type="button">Cancel</button></div>
    <Status state={state} />
  </form> : <button className="min-h-11 text-sm text-muted underline underline-offset-4" onClick={() => setConfirm(true)} type="button">Leave Circle</button>;
}
