export const AVATAR_BUCKET = "avatars";

const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const avatarPathPattern = new RegExp(`^${uuid}/avatar-${uuid}\\.(?:jpe?g|png|webp)$`, "i");

export function isAvatarPath(value: unknown): value is string {
  return typeof value === "string" && avatarPathPattern.test(value);
}

export function avatarBelongsToUser(path: unknown, userId: string): path is string {
  return isAvatarPath(path) && path.startsWith(`${userId}/`);
}

export function avatarPublicUrl(path: string | null | undefined) {
  if (!isAvatarPath(path)) return null;
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return null;
  return `${baseUrl}/storage/v1/object/public/${AVATAR_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export function avatarInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "S";
}
