import type { Json } from "@/types/database";

export type NotificationItem = {
  id: string;
  sessionId: string;
  actorDisplayName: string;
  actorUsername: string;
  createdAt: string;
  read: boolean;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseNotifications(value: Json | null): NotificationItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || Array.isArray(entry) || typeof entry !== "object") return [];
    const item = entry as Record<string, Json | undefined>;
    if (typeof item.id !== "string" || !uuid.test(item.id) || typeof item.sessionId !== "string" || !uuid.test(item.sessionId) || typeof item.actorDisplayName !== "string" || typeof item.actorUsername !== "string" || typeof item.createdAt !== "string") return [];
    return [{ id:item.id, sessionId:item.sessionId, actorDisplayName:item.actorDisplayName, actorUsername:item.actorUsername, createdAt:item.createdAt, read:item.read===true }];
  });
}
