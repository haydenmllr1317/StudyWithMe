"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { finalizeAvatarAction, removeAvatarAction } from "@/app/avatar-actions";
import { Avatar } from "@/components/ui/avatar";
import { prepareImage } from "@/lib/image-upload";
import { createClient } from "@/lib/supabase/client";

export function AvatarUpload({ avatarPath: initialPath, displayName }: { avatarPath: string | null; displayName: string }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [avatarPath, setAvatarPath] = useState(initialPath);
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);

  function choose(file: File | undefined) {
    if (!file) return;
    setMessage(undefined);
    setPending(true);
    void (async () => {
      let uploadedPath: string | null = null;
      const supabase = createClient();
      try {
        const prepared = await prepareImage(file, { maxBytes: 20 * 1024 * 1024, maxDimension: 512, square: true });
        if (prepared.size > 4 * 1024 * 1024) throw new Error("The prepared photo is still too large. Choose a simpler or smaller image.");
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) throw new Error("Log in again to change your photo.");
        uploadedPath = `${userData.user.id}/avatar-${crypto.randomUUID()}.webp`;
        const uploaded = await supabase.storage.from("avatars").upload(uploadedPath, prepared, { cacheControl: "31536000", contentType: "image/webp", upsert: false });
        if (uploaded.error) throw new Error("The photo could not be uploaded. Check your connection and try again.");
        const result = await finalizeAvatarAction(uploadedPath);
        if (result.message) await supabase.storage.from("avatars").remove([uploadedPath]);
        if (result.avatarPath) {
          setAvatarPath(result.avatarPath);
          router.refresh();
        }
        setMessage(result.message ?? result.success);
      } catch (error) {
        if (uploadedPath) await supabase.storage.from("avatars").remove([uploadedPath]);
        setMessage(error instanceof Error ? error.message : "The photo could not be prepared.");
      } finally {
        setPending(false);
        if (input.current) input.current.value = "";
      }
    })();
  }

  function remove() {
    setMessage(undefined);
    setPending(true);
    void (async () => {
      const result = await removeAvatarAction();
      if (!result.message) {
        setAvatarPath(null);
        router.refresh();
      }
      setMessage(result.message ?? result.success);
      setPending(false);
    })();
  }

  return <div className="shrink-0 text-center">
    <button aria-label="Change profile photo" className="block rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coral disabled:cursor-wait disabled:opacity-60" disabled={pending} onClick={() => input.current?.click()} type="button"><Avatar avatarPath={avatarPath} className="bg-moss-soft text-moss-dark" displayName={displayName} size="lg" /></button>
    <input accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" className="sr-only" disabled={pending} onChange={(event) => choose(event.target.files?.[0])} ref={input} type="file" />
    <div className="mt-2 flex justify-center gap-3 text-xs font-semibold"><button className="text-coral underline underline-offset-4 disabled:opacity-50" disabled={pending} onClick={() => input.current?.click()} type="button">{pending ? "Working…" : "Change"}</button>{avatarPath && <button className="text-muted underline underline-offset-4 disabled:opacity-50" disabled={pending} onClick={remove} type="button">Remove</button>}</div>
    {message && <p aria-live="polite" className="mt-2 max-w-40 text-xs leading-4 text-muted">{message}</p>}
  </div>;
}
