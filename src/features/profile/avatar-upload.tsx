"use client";

import { useRef, useState, useTransition } from "react";
import { removeAvatarAction, uploadAvatarAction } from "@/app/avatar-actions";
import { Avatar } from "@/components/ui/avatar";

async function prepareAvatar(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choose a JPEG, PNG, or WebP image.");
  if (file.size > 12 * 1024 * 1024) throw new Error("Choose an image smaller than 12 MB.");
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not prepare the image.");
  const side = Math.min(bitmap.width, bitmap.height);
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 512, 512);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.84));
  if (!blob) throw new Error("This browser could not prepare the image.");
  return new File([blob], "avatar.webp", { type: "image/webp" });
}

export function AvatarUpload({ avatarPath: initialPath, displayName }: { avatarPath: string | null; displayName: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [avatarPath, setAvatarPath] = useState(initialPath);
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  function choose(file: File | undefined) {
    if (!file) return;
    setMessage(undefined);
    startTransition(async () => {
      try {
        const prepared = await prepareAvatar(file);
        const data = new FormData();
        data.set("avatar", prepared);
        const result = await uploadAvatarAction({}, data);
        if (result.avatarPath) setAvatarPath(result.avatarPath);
        setMessage(result.message ?? result.success);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "The photo could not be prepared.");
      } finally {
        if (input.current) input.current.value = "";
      }
    });
  }

  function remove() {
    setMessage(undefined);
    startTransition(async () => {
      const result = await removeAvatarAction();
      if (!result.message) setAvatarPath(null);
      setMessage(result.message ?? result.success);
    });
  }

  return <div className="shrink-0 text-center">
    <button aria-label="Change profile photo" className="block rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coral disabled:cursor-wait disabled:opacity-60" disabled={pending} onClick={() => input.current?.click()} type="button"><Avatar avatarPath={avatarPath} className="bg-moss-soft text-moss-dark" displayName={displayName} size="lg" /></button>
    <input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={pending} onChange={(event) => choose(event.target.files?.[0])} ref={input} type="file" />
    <div className="mt-2 flex justify-center gap-3 text-xs font-semibold"><button className="text-coral underline underline-offset-4 disabled:opacity-50" disabled={pending} onClick={() => input.current?.click()} type="button">{pending ? "Working…" : "Change"}</button>{avatarPath && <button className="text-muted underline underline-offset-4 disabled:opacity-50" disabled={pending} onClick={remove} type="button">Remove</button>}</div>
    {message && <p aria-live="polite" className="mt-2 max-w-40 text-xs leading-4 text-muted">{message}</p>}
  </div>;
}
