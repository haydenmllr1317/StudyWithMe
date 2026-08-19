-- A completed session has exactly one Activity destination. A null
-- activity_circle_id means Personal; a non-null value means that Circle.
-- The share table introduced by the multi-Circle experiment is retained only
-- as a database-maintained projection for the existing feed/analytics RPCs.

-- Preserve one deterministic Circle for sessions written while the
-- multi-Circle model was active, preferring the compatibility pointer already
-- stored on the session.
update public.study_sessions s
set activity_circle_id = chosen.group_id
from (
  select distinct on (scs.session_id) scs.session_id, scs.group_id
  from public.session_circle_shares scs
  join public.study_sessions owned on owned.id = scs.session_id
  join public.group_members gm
    on gm.group_id = scs.group_id and gm.user_id = owned.user_id
  order by scs.session_id, scs.created_at, scs.group_id
) chosen
where s.id = chosen.session_id and s.activity_circle_id is null;

delete from public.session_circle_shares;
insert into public.session_circle_shares(session_id, group_id)
select id, activity_circle_id
from public.study_sessions
where activity_circle_id is not null;

create unique index session_circle_shares_one_destination_idx
  on public.session_circle_shares(session_id);

create function private.sync_session_activity_destination()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.session_circle_shares where session_id = new.id;
  if new.activity_circle_id is not null then
    insert into public.session_circle_shares(session_id, group_id)
    values(new.id, new.activity_circle_id);
  end if;
  return new;
end;
$$;
revoke all on function private.sync_session_activity_destination() from public, anon, authenticated;

create trigger study_sessions_sync_activity_destination
after insert or update of activity_circle_id on public.study_sessions
for each row execute function private.sync_session_activity_destination();

drop function if exists public.update_study_session_reflection(uuid,text,smallint,text,uuid[]);
drop function if exists public.create_manual_study_session(date,time,integer,uuid,smallint,text,uuid[]);

create or replace function private.can_view_activity_session(target_session_id uuid, viewer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.study_sessions s
    where s.id = target_session_id
      and s.ended_at is not null
      and s.duration_seconds > 0
      and (
        s.user_id = viewer_id
        or (
          s.activity_circle_id is not null
          and exists (
            select 1 from public.group_members author_membership
            where author_membership.group_id = s.activity_circle_id
              and author_membership.user_id = s.user_id
          )
          and exists (
            select 1 from public.group_members viewer_membership
            where viewer_membership.group_id = s.activity_circle_id
              and viewer_membership.user_id = viewer_id
          )
        )
      )
  );
$$;

comment on column public.study_sessions.activity_circle_id is
  'Canonical Activity destination: null is Personal; otherwise exactly one current Circle.';
comment on table public.session_circle_shares is
  'Database-maintained one-row projection of study_sessions.activity_circle_id for feed and analytics joins; clients cannot write it.';
comment on function private.can_view_activity_session(uuid,uuid) is
  'Allows the author or current members of the assigned Circle while the author also remains a current member.';
