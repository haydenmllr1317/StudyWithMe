import type { Json } from "@/types/database";

export type NotificationItem = {
  id: string;
  sessionId: string;
  actorDisplayName: string;
  actorUsername: string;
  createdAt: string;
  read: boolean;
};

export function parseNotifications(value: Json | null): NotificationItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || Array.isArray(entry) || typeof entry !== "object") return [];
    const item = entry as Record<string, Json | undefined>;
    return typeof item.id === "string" && typeof item.sessionId === "string" &&
      typeof item.actorDisplayName === "string" && typeof item.actorUsername === "string" &&
      typeof item.createdAt === "string"
      ? [{ id: item.id, sessionId: item.sessionId, actorDisplayName: item.actorDisplayName, actorUsername: item.actorUsername, createdAt: item.createdAt, read: item.read === true }]
      : [];
  });
}
