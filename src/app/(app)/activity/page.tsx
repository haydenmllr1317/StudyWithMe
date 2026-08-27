import { redirect } from "next/navigation";
import { PageHeading } from "@/components/ui/page-heading";
import { ActivityFeed } from "@/features/activity/activity-feed";
import { ActivityScopeSelect } from "@/features/activity/activity-scope-select";
import { activityScopeAllowed, parseActivityCursor, parseActivityFeed, parseActivityScope } from "@/lib/activity";
import { parseGroups } from "@/lib/groups";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const scope = parseActivityScope(params.scope);
  const cursor = parseActivityCursor(params.before, params.beforeId);
  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || typeof claims?.claims?.sub !== "string") redirect("/login");

  const circleId = scope.startsWith("circle:") ? scope.slice(7) : undefined;
  const [groupsResult, feedResult] = await Promise.all([
    supabase.rpc("get_my_study_groups"),
    supabase.rpc("get_activity_feed", {
      p_scope: circleId ? "circle" : scope,
      ...(circleId ? { p_group_id: circleId } : {}),
      ...(cursor.before && cursor.beforeId ? { p_before_ended_at: cursor.before, p_before_id: cursor.beforeId } : {}),
      p_limit: 20,
    }),
  ]);
  const circles = parseGroups(groupsResult.data);
  if (!activityScopeAllowed(scope, circles)) redirect("/activity?scope=all_circles");
  if (groupsResult.error) console.error("Activity Circle lookup failed", { code: groupsResult.error.code });
  if (feedResult.error) console.error("Activity feed lookup failed", { code: feedResult.error.code });
  const feed = parseActivityFeed(feedResult.data);
  if (feed) {
    feed.items = feed.items.map((item)=>({...item,reflectionPhotoUrl:item.reflectionPhotoPath?`/activity/photo/${item.id}`:null}));
  }

  return <div className="space-y-9">
    <PageHeading aside={<ActivityScopeSelect circles={circles} value={scope} />} title="Activity" />
    {(groupsResult.error || feedResult.error || !feed) ? <div className="border-y border-line py-8" role="alert"><h2 className="font-semibold text-ink">Activity is unavailable.</h2><p className="mt-2 text-sm text-muted">Refresh to try again. Your private notes remain private.</p></div> : <ActivityFeed data={feed} scope={scope} />}
  </div>;
}
