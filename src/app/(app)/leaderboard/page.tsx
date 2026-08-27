import { redirect } from "next/navigation";
import { PageHeading } from "@/components/ui/page-heading";
import { GroupsPanel } from "@/features/groups/groups-panel";
import { parseGroups } from "@/lib/groups";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string") redirect("/login");
  const groupsResult = await supabase.rpc("get_my_study_groups");
  const circles = parseGroups(groupsResult.data);
  if (circles.length) redirect(`/groups/${circles[0].id}`);

  return <div className="space-y-10">
    <PageHeading title="Circles" />
    {groupsResult.error ? <div className="border-y border-line py-8" role="alert"><h2 className="font-semibold text-ink">Your Circles are unavailable.</h2><p className="mt-2 text-sm text-muted">Refresh to try again.</p></div> : <><div className="border-y border-line py-8"><h2 className="text-xl font-semibold text-ink">Your leaderboard starts with an invitation.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted">Join a Circle through an invite link, or create one and invite the people you want to study with. There is no global community leaderboard.</p></div><GroupsPanel groups={[]} /></>}
  </div>;
}
