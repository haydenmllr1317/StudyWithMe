-- Activity visibility may be granted through any shared Circle, but the
-- returned Circle labels must include only Circles the current viewer belongs
-- to. The underlying session_circle_shares rows remain unchanged.
create or replace function public.get_activity_feed(
  p_scope text default 'all_circles', p_group_id uuid default null,
  p_before_ended_at timestamptz default null, p_before_id uuid default null, p_limit integer default 20
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid := (select auth.uid()); scope text := lower(btrim(p_scope)); tz text; result jsonb;
begin
  if u is null then raise exception using errcode='42501', message='Authentication required'; end if;
  if scope is null or scope not in('mine','all_circles','circle') then raise exception using errcode='22023', message='Unsupported activity scope'; end if;
  if p_limit is null or p_limit not between 1 and 50 then raise exception using errcode='22023', message='Activity limit must be between 1 and 50'; end if;
  if (p_before_ended_at is null) <> (p_before_id is null) then raise exception using errcode='22023', message='Activity cursor is incomplete'; end if;
  if scope='circle' and (p_group_id is null or not exists(select 1 from public.group_members where group_id=p_group_id and user_id=u)) then raise exception using errcode='42501', message='Circle membership required'; end if;
  select timezone into tz from public.profiles where id=u; tz := coalesce(tz,'UTC');
  with candidates as materialized (
    select s.id,s.user_id,s.ended_at,s.duration_seconds,s.rating,s.notes,s.reflection_photo_path,
      p.display_name,p.username::text username,coalesce(goal.name,'Study session') goal_name,
      coalesce(shared.circles,'[]'::jsonb) circles,
      (select count(*)::int from public.session_loves l where l.session_id=s.id) love_count,
      exists(select 1 from public.session_loves l where l.session_id=s.id and l.user_id=u) is_loved
    from public.study_sessions s
    join public.profiles p on p.id=s.user_id
    left join public.study_goals goal on goal.id=s.goal_id and goal.user_id=s.user_id
    left join lateral (
      select jsonb_agg(jsonb_build_object('id',g.id,'name',g.name) order by g.name) circles
      from public.session_circle_shares scs
      join public.groups g on g.id=scs.group_id
      join public.group_members viewer_membership
        on viewer_membership.group_id=scs.group_id and viewer_membership.user_id=u
      where scs.session_id=s.id
    ) shared on true
    where s.ended_at is not null and s.duration_seconds>0
      and (p_before_ended_at is null or (s.ended_at,s.id)<(p_before_ended_at,p_before_id))
      and (select private.can_view_activity_session(s.id,u))
      and ((scope='mine' and s.user_id=u)
        or (scope='all_circles' and exists(select 1 from public.session_circle_shares scs where scs.session_id=s.id))
        or (scope='circle' and exists(select 1 from public.session_circle_shares scs where scs.session_id=s.id and scs.group_id=p_group_id)))
    order by s.ended_at desc,s.id desc limit p_limit+1
  ), visible as (select * from candidates order by ended_at desc,id desc limit p_limit),
  cursor_row as (select ended_at,id from visible order by ended_at,id limit 1)
  select jsonb_build_object('timezone',tz,'items',coalesce((select jsonb_agg(jsonb_build_object(
    'id',v.id,'displayName',v.display_name,'username',v.username,'goalName',v.goal_name,
    'durationSeconds',v.duration_seconds,'completedAt',date_trunc('minute',v.ended_at),'rating',v.rating,
    'sharedNotes',v.notes,'reflectionPhotoPath',v.reflection_photo_path,'circles',v.circles,
    'loveCount',v.love_count,'isLoved',v.is_loved,'canLove',v.user_id<>u,'isCurrentUser',v.user_id=u
  ) order by v.ended_at desc,v.id desc) from visible v),'[]'::jsonb),
  'nextCursor',case when(select count(*) from candidates)>p_limit then(select jsonb_build_object('endedAt',c.ended_at,'id',c.id)from cursor_row c)end) into result;
  return result;
end;
$$;

revoke all on function public.get_activity_feed(text,uuid,timestamptz,uuid,integer) from public, anon;
grant execute on function public.get_activity_feed(text,uuid,timestamptz,uuid,integer) to authenticated;

comment on function public.get_activity_feed(text,uuid,timestamptz,uuid,integer) is
  'Membership-authorized Activity feed whose Circle labels are filtered to the current viewer memberships.';
