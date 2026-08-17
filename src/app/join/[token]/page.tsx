import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeading } from "@/components/ui/page-heading";
import { JoinGroupForm } from "@/features/groups/group-forms";
import { createClient } from "@/lib/supabase/server";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string") redirect(`/login?next=/join/${encodeURIComponent(token)}`);
  const { data, error } = await supabase.rpc("preview_group_invite", { p_token: token });
  const invite = data && !Array.isArray(data) && typeof data === "object" ? data as Record<string, unknown> : null;

  return <AppShell><div className="mx-auto max-w-xl space-y-8">
    <PageHeading description="Joining never exposes private sessions, goals, or notes." title="Circle invitation" />
    {error || !invite ? <div className="border-y border-line py-8"><h2 className="font-semibold text-ink">This invite is no longer available.</h2><p className="mt-2 text-sm text-muted">Ask the Circle owner for a new link.</p><Link className="mt-5 inline-block text-sm font-semibold text-coral underline underline-offset-4" href="/leaderboard">Return to Circle</Link></div> : <section className="border-y border-line py-7"><h2 className="text-2xl font-semibold tracking-[-0.03em] text-ink">{String(invite.name)}</h2><p className="mt-2 text-sm text-muted">{Number(invite.memberCount) || 0} {(Number(invite.memberCount) || 0) === 1 ? "member" : "members"}</p><div className="mt-6">{invite.isMember ? <><p className="text-sm text-muted">You already belong to this Circle.</p><Link className="mt-4 inline-block text-sm font-semibold text-coral underline underline-offset-4" href="/leaderboard">Open Circle</Link></> : <JoinGroupForm token={token} />}</div></section>}
  </div></AppShell>;
}
