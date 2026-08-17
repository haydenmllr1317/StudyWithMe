/* eslint-disable @next/next/no-img-element */
import { avatarInitials, avatarPublicUrl } from "@/lib/avatar";

/* Avatars are pre-sized to 512px, public CDN assets with immutable versioned paths. */

const sizes = { sm: "size-9 text-xs", md: "size-11 text-sm", lg: "size-16 text-lg" };

export function Avatar({ avatarPath, className = "", displayName, size = "md" }: {
  avatarPath?: string | null;
  className?: string;
  displayName: string;
  size?: keyof typeof sizes;
}) {
  const src = avatarPublicUrl(avatarPath);
  return <span aria-hidden="true" className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-sky-soft font-semibold text-ink ${sizes[size]} ${className}`}>
    {src ? <img alt="" className="size-full object-cover" height={size === "lg" ? 64 : size === "md" ? 44 : 36} loading="lazy" src={src} width={size === "lg" ? 64 : size === "md" ? 44 : 36} /> : avatarInitials(displayName)}
  </span>;
}
