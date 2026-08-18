create table public.session_circle_shares(
 session_id uuid not null references public.study_sessions(id)on delete cascade,
 group_id uuid not null references public.groups(id)on delete cascade,
 created_at timestamptz not null default now(),
 primary key(session_id,group_id)
);
create index session_circle_shares_group_session_idx on public.session_circle_shares(group_id,session_id);
alter table public.session_circle_shares enable row level security;
revoke all on public.session_circle_shares from public,anon,authenticated;

insert into public.session_circle_shares(session_id,group_id)
select id,activity_circle_id from public.study_sessions where activity_circle_id is not null on conflict do nothing;

create or replace function private.can_view_activity_session(target_session_id uuid,viewer_id uuid)
returns boolean language sql stable security definer set search_path=''as $$
 select exists(select 1 from public.study_sessions s where s.id=target_session_id and s.ended_at is not null and s.duration_seconds>0 and(
  s.user_id=viewer_id or exists(select 1 from public.session_circle_shares scs join public.group_members gm on gm.group_id=scs.group_id where scs.session_id=s.id and gm.user_id=viewer_id)));
$$;

create function public.update_study_session_reflection(
 p_session_id uuid,p_notes text,p_rating smallint,p_reflection_photo_path text,p_activity_circle_ids uuid[]
)returns public.study_sessions language plpgsql security definer set search_path=''as $$
declare u uuid:=(select auth.uid());ids uuid[]:=coalesce(p_activity_circle_ids,'{}'::uuid[]);s public.study_sessions;
begin
 if u is null then raise exception using errcode='42501',message='Authentication required';end if;
 if cardinality(ids)<>cardinality(array(select distinct x from unnest(ids)x))then raise exception using errcode='22023',message='Choose each Circle once';end if;
 if exists(select 1 from unnest(ids)x where not exists(select 1 from public.group_members gm where gm.group_id=x and gm.user_id=u))then raise exception using errcode='42501',message='You can only share to Circles you belong to';end if;
 select public.update_study_session_reflection(p_session_id,p_notes,p_rating,p_reflection_photo_path,ids[1])into s;
 delete from public.session_circle_shares where session_id=p_session_id;
 insert into public.session_circle_shares(session_id,group_id)select p_session_id,x from unnest(ids)x;
 return s;
end;$$;
revoke all on function public.update_study_session_reflection(uuid,text,smallint,text,uuid[])from public,anon;
grant execute on function public.update_study_session_reflection(uuid,text,smallint,text,uuid[])to authenticated;

create function public.create_manual_study_session(
 p_local_date date,p_local_time time,p_duration_minutes integer,p_goal_id uuid,p_rating smallint,p_notes text,p_activity_circle_ids uuid[]
)returns public.study_sessions language plpgsql security definer set search_path=''as $$
declare u uuid:=(select auth.uid());ids uuid[]:=coalesce(p_activity_circle_ids,'{}'::uuid[]);s public.study_sessions;
begin
 if u is null then raise exception using errcode='42501',message='Authentication required';end if;
 if cardinality(ids)<>cardinality(array(select distinct x from unnest(ids)x))then raise exception using errcode='22023',message='Choose each Circle once';end if;
 if exists(select 1 from unnest(ids)x where not exists(select 1 from public.group_members gm where gm.group_id=x and gm.user_id=u))then raise exception using errcode='42501',message='You can only share to Circles you belong to';end if;
 select public.create_manual_study_session(p_local_date,p_local_time,p_duration_minutes,p_goal_id,p_rating,p_notes,ids[1])into s;
 insert into public.session_circle_shares(session_id,group_id)select s.id,x from unnest(ids)x;
 return s;
end;$$;
revoke all on function public.create_manual_study_session(date,time,integer,uuid,smallint,text,uuid[])from public,anon;
grant execute on function public.create_manual_study_session(date,time,integer,uuid,smallint,text,uuid[])to authenticated;
create or replace function public.get_activity_feed(
  p_scope text default 'all_circles', p_group_id uuid default null,
  p_before_ended_at timestamptz default null, p_before_id uuid default null, p_limit integer default 20
)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid := (select auth.uid()); scope text := lower(btrim(p_scope)); tz text; result jsonb;
begin
 if u is null then raise exception using errcode='42501',message='Authentication required'; end if;
 if scope is null or scope not in('mine','all_circles','circle') then raise exception using errcode='22023',message='Unsupported activity scope'; end if;
 if p_limit is null or p_limit not between 1 and 50 then raise exception using errcode='22023',message='Activity limit must be between 1 and 50'; end if;
 if (p_before_ended_at is null) <> (p_before_id is null) then raise exception using errcode='22023',message='Activity cursor is incomplete'; end if;
 if scope='circle' and (p_group_id is null or not exists(select 1 from public.group_members where group_id=p_group_id and user_id=u)) then raise exception using errcode='42501',message='Circle membership required'; end if;
 select timezone into tz from public.profiles where id=u; tz := coalesce(tz,'UTC');
 with candidates as materialized (
  select s.id,s.user_id,s.ended_at,s.duration_seconds,s.rating,s.notes,s.reflection_photo_path,shared.circles,
   p.display_name,p.username::text username,coalesce(goal.name,'Study session') goal_name,
   
   (select count(*)::int from public.session_loves l where l.session_id=s.id) love_count,
   exists(select 1 from public.session_loves l where l.session_id=s.id and l.user_id=u) is_loved
  from public.study_sessions s
  join public.profiles p on p.id=s.user_id
  left join public.study_goals goal on goal.id=s.goal_id and goal.user_id=s.user_id
  left join lateral(select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'name',g.name)order by g.name),'[]'::jsonb)circles from public.session_circle_shares scs join public.groups g on g.id=scs.group_id where scs.session_id=s.id)shared on true
  where s.ended_at is not null and s.duration_seconds>0
    and (p_before_ended_at is null or (s.ended_at,s.id)<(p_before_ended_at,p_before_id))
    and (select private.can_view_activity_session(s.id,u))
    and (
      (scope='mine' and s.user_id=u)
      or (scope='all_circles' and exists(select 1 from public.session_circle_shares scs where scs.session_id=s.id))
      or (scope='circle' and exists(select 1 from public.session_circle_shares scs where scs.session_id=s.id and scs.group_id=p_group_id))
    )
  order by s.ended_at desc,s.id desc limit p_limit+1
 ), visible as (select * from candidates order by ended_at desc,id desc limit p_limit),
 cursor_row as (select ended_at,id from visible order by ended_at,id limit 1)
 select jsonb_build_object('timezone',tz,'items',coalesce((select jsonb_agg(jsonb_build_object(
  'id',v.id,'displayName',v.display_name,'username',v.username,'goalName',v.goal_name,
  'durationSeconds',v.duration_seconds,'completedAt',date_trunc('minute',v.ended_at),'rating',v.rating,
  'sharedNotes',v.notes,'reflectionPhotoPath',v.reflection_photo_path,
  'circles',v.circles,
  'loveCount',v.love_count,'isLoved',v.is_loved,'canLove',v.user_id<>u,'isCurrentUser',v.user_id=u
 ) order by v.ended_at desc,v.id desc) from visible v),'[]'::jsonb),
 'nextCursor',case when(select count(*) from candidates)>p_limit then(select jsonb_build_object('endedAt',c.ended_at,'id',c.id)from cursor_row c)end) into result;
 return result;
end;
$$;

create or replace function public.toggle_session_love(p_session_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare u uuid := (select auth.uid()); affected integer;
begin
  if u is null then raise exception using errcode='42501', message='Authentication required'; end if;
  if not exists(select 1 from public.study_sessions s where s.id=p_session_id and s.user_id<>u and (select private.can_view_activity_session(s.id,u))) then
    raise exception using errcode='42501', message='Session is not available to love';
  end if;
  delete from public.session_loves where session_id=p_session_id and user_id=u;
  if found then return false; end if;
  insert into public.session_loves(session_id,user_id) values(p_session_id,u) on conflict do nothing;
  get diagnostics affected = row_count;
  return affected=1;
end;
$$;

-- Range membership is based on completion time in the viewer's timezone. Every
-- aggregate uses the stored duration_seconds unchanged, so daily, goal, total,
-- and leaderboard values cannot drift from one another.
create or replace function public.get_study_analytics(p_scope text default 'mine',p_group_id uuid default null,p_range text default '30d',p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=(select auth.uid()); tz text; today date; start_date date; start_at timestamptz; end_at timestamptz; result jsonb;
begin
 if u is null then raise exception using errcode='42501',message='Authentication required'; end if;
 p_scope:=lower(btrim(p_scope)); p_range:=lower(btrim(p_range));
 if p_scope not in('mine','circle') then raise exception using errcode='22023',message='Unsupported analytics scope'; end if;
 if p_range not in('7d','30d','3m','6m','1y','all') then raise exception using errcode='22023',message='Unsupported analytics timeframe'; end if;
 if p_limit is null or p_limit not between 1 and 100 then raise exception using errcode='22023',message='Leaderboard limit must be between 1 and 100'; end if;
 if p_scope='circle' and(p_group_id is null or not exists(select 1 from public.group_members m where m.group_id=p_group_id and m.user_id=u)) then raise exception using errcode='42501',message='Circle membership required'; end if;
 select coalesce(p.timezone,'UTC') into tz from public.profiles p where p.id=u; tz:=coalesce(tz,'UTC'); today:=(clock_timestamp() at time zone tz)::date;
 start_date:=case p_range when'7d'then today-6 when'30d'then today-29 when'3m'then(today-interval'3 months')::date+1 when'6m'then(today-interval'6 months')::date+1 when'1y'then(today-interval'1 year')::date+1 else null end;
 start_at:=case when start_date is null then'-infinity'::timestamptz else start_date::timestamp at time zone tz end; end_at:=(today+1)::timestamp at time zone tz;
 with population as materialized (
  select p.id user_id,p.display_name,p.username::text username,p.avatar_url from public.profiles p
  where (p_scope='mine'and p.id=u) or (p_scope='circle'and exists(select 1 from public.group_members m where m.group_id=p_group_id and m.user_id=p.id))
 ), completed as materialized (
  select s.id,s.user_id,s.goal_id,s.ended_at,s.duration_seconds from public.study_sessions s join population p on p.user_id=s.user_id
  where s.ended_at is not null and s.duration_seconds>0 and s.ended_at>=start_at and s.ended_at<end_at
 ), first_day as (select coalesce(start_date,least(today,min((c.ended_at at time zone tz)::date)),today)d from completed c),
 days as(select generate_series((select d from first_day),today,interval'1 day')::date d),
 daily as (select d.d,coalesce(sum(c.duration_seconds),0)::bigint seconds from days d left join completed c on (c.ended_at at time zone tz)::date=d.d group by d.d),
 named_goals as(select c.user_id,coalesce(g.name,'General study')name,c.duration_seconds::bigint seconds from completed c left join public.study_goals g on g.id=c.goal_id and g.user_id=c.user_id),
 goal_groups as(select name,sum(seconds)::bigint seconds,count(distinct user_id)::int contributors from named_goals group by name),
 safe_goals as(select case when p_scope='mine'or contributors>=2 then name else'Other study'end name,sum(seconds)::bigint seconds from goal_groups group by case when p_scope='mine'or contributors>=2 then name else'Other study'end),
 totals as(select p.user_id,p.display_name,p.username,p.avatar_url,coalesce(sum(c.duration_seconds),0)::bigint seconds from population p left join completed c on c.user_id=p.user_id group by p.user_id,p.display_name,p.username,p.avatar_url),
 ranked as(select t.*,case when t.seconds>0 then dense_rank()over(order by t.seconds desc)::bigint end rank from totals t),
 visible as(select*from ranked order by(rank is null),rank,lower(username),user_id limit p_limit)
 select jsonb_build_object('scope',p_scope,'range',p_range,'timezone',tz,'totalSeconds',(select coalesce(sum(duration_seconds),0)::bigint from completed),
  'daily',(select coalesce(jsonb_agg(jsonb_build_object('date',d,'seconds',seconds)order by d),'[]'::jsonb)from daily),
  'goals',(select coalesce(jsonb_agg(jsonb_build_object('name',name,'seconds',seconds)order by seconds desc,name),'[]'::jsonb)from safe_goals where seconds>0),
  'leaderboard',case when p_scope='mine'then'[]'::jsonb else(select coalesce(jsonb_agg(jsonb_build_object('displayName',display_name,'username',username,'avatarPath',avatar_url,'durationSeconds',seconds,'rank',rank,'isCurrentUser',user_id=u)order by(rank is null),rank,lower(username)),'[]'::jsonb)from visible)end
 ) into result;
 return result;
end;
$$;

drop function if exists public.get_application_leaderboard(text,integer);

comment on column public.study_sessions.activity_circle_id is
  'Compatibility pointer to the first shared Circle; session_circle_shares is authoritative.';

create or replace function public.get_circle_member_analytics(p_group_id uuid,p_range text default'30d',p_limit integer default 50)
returns jsonb language plpgsql volatile security definer set search_path=''as $$
declare u uuid:=(select auth.uid());tz text;today date;start_date date;start_at timestamptz;end_at timestamptz;result jsonb;
begin
 if u is null then raise exception using errcode='42501',message='Authentication required';end if;
 p_range:=lower(btrim(p_range));if p_range not in('7d','30d','3m','6m','1y','all')then raise exception using errcode='22023',message='Unsupported analytics timeframe';end if;
 if p_limit is null or p_limit not between 1 and 100 then raise exception using errcode='22023',message='Leaderboard limit must be between 1 and 100';end if;
 if not exists(select 1 from public.group_members gm where gm.group_id=p_group_id and gm.user_id=u)then raise exception using errcode='42501',message='Circle membership required';end if;
 select coalesce(p.timezone,'UTC')into tz from public.profiles p where p.id=u;today:=(clock_timestamp()at time zone tz)::date;
 start_date:=private.analytics_start_date(p_range,today);start_at:=case when start_date is null then'-infinity'::timestamptz else start_date::timestamp at time zone tz end;end_at:=(today+1)::timestamp at time zone tz;
 with members as materialized(select p.id user_id,p.display_name,p.username::text username,p.avatar_url from public.group_members gm join public.profiles p on p.id=gm.user_id where gm.group_id=p_group_id),
 completed as materialized(select s.id,s.user_id,s.goal_id,s.ended_at,s.duration_seconds,coalesce(g.name,'Legacy session')goal_name from public.study_sessions s join members m on m.user_id=s.user_id left join public.study_goals g on g.id=s.goal_id and g.user_id=s.user_id where exists(select 1 from public.session_circle_shares scs where scs.session_id=s.id and scs.group_id=p_group_id)and s.ended_at is not null and s.duration_seconds>0 and s.ended_at>=start_at and s.ended_at<end_at),
 first_day as(select coalesce(start_date,least(today,min((c.ended_at at time zone tz)::date)),today)d from completed c),days as(select generate_series((select d from first_day),today,interval'1 day')::date d),
 member_days as(select m.user_id,d.d,coalesce(sum(c.duration_seconds),0)::bigint seconds from members m cross join days d left join completed c on c.user_id=m.user_id and(c.ended_at at time zone tz)::date=d.d group by m.user_id,d.d),
 member_day_goals as(select c.user_id,(c.ended_at at time zone tz)::date d,c.goal_id,c.goal_name,sum(c.duration_seconds)::bigint seconds from completed c group by c.user_id,(c.ended_at at time zone tz)::date,c.goal_id,c.goal_name),
 totals as(select m.user_id,m.display_name,m.username,m.avatar_url,coalesce(sum(c.duration_seconds),0)::bigint seconds from members m left join completed c on c.user_id=m.user_id group by m.user_id,m.display_name,m.username,m.avatar_url),
 ranked as(select t.*,case when t.seconds>0 then dense_rank()over(order by t.seconds desc)::bigint end rank from totals t),visible as(select*from ranked order by(rank is null),rank,lower(username),user_id limit p_limit)
 select jsonb_build_object('scope','circle','range',p_range,'timezone',tz,'totalSeconds',(select coalesce(sum(duration_seconds),0)::bigint from completed),'daily','[]'::jsonb,'goals','[]'::jsonb,
  'leaderboard',(select coalesce(jsonb_agg(jsonb_build_object('userId',v.user_id,'displayName',v.display_name,'username',v.username,'avatarPath',v.avatar_url,'durationSeconds',v.seconds,'rank',v.rank,'isCurrentUser',v.user_id=u)order by(v.rank is null),v.rank,lower(v.username)),'[]'::jsonb)from visible v),
  'members',(select coalesce(jsonb_agg(jsonb_build_object('userId',v.user_id,'displayName',v.display_name,'username',v.username,'durationSeconds',v.seconds,'isCurrentUser',v.user_id=u,'daily',
   (select coalesce(jsonb_agg(jsonb_build_object('date',md.d,'seconds',md.seconds,'goals',(select coalesce(jsonb_agg(jsonb_build_object('name',mg.goal_name,'seconds',mg.seconds)order by mg.seconds desc,mg.goal_name),'[]'::jsonb)from member_day_goals mg where mg.user_id=md.user_id and mg.d=md.d))order by md.d),'[]'::jsonb)from member_days md where md.user_id=v.user_id))order by(v.rank is null),v.rank,lower(v.username)),'[]'::jsonb)from visible v))into result;return result;
end;
$$;
