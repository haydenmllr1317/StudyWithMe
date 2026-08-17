-- Avatar paths are stored in profiles.avatar_url. The bucket is public-read so
-- social avatar rendering never requires signed-URL fan-out; all writes remain
-- authenticated and constrained to the caller's UUID folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can upload their own avatar"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can update their own avatar"
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can delete their own avatar"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Full profile rows remain owner-only, but this additional boundary prevents an
-- owner from assigning another user's publicly readable avatar to themselves.
-- It checks only avatar changes so any legacy external value cannot break an
-- unrelated profile update before that user chooses a new photo.
create or replace function public.enforce_owned_avatar_path()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT' or new.avatar_url is distinct from old.avatar_url)
    and new.avatar_url is not null
    and (
      split_part(new.avatar_url, '/', 1) <> new.id::text
      or new.avatar_url !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/avatar-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpe?g|png|webp)$'
    )
  then
    raise exception using errcode = '23514', message = 'Avatar path must belong to the profile owner';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_enforce_owned_avatar_path on public.profiles;
create trigger profiles_enforce_owned_avatar_path
before insert or update of avatar_url on public.profiles
for each row execute function public.enforce_owned_avatar_path();

revoke all on function public.enforce_owned_avatar_path() from public, anon, authenticated;

create or replace function public.get_activity_feed(
  p_scope text default 'everyone', p_group_id uuid default null,
  p_before_ended_at timestamptz default null, p_before_id uuid default null,
  p_limit integer default 20
)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_user_id uuid := (select auth.uid()); v_scope text := lower(btrim(p_scope));
  v_timezone text; v_result jsonb;
begin
  if v_user_id is null then raise exception using errcode='42501',message='Authentication required'; end if;
  if v_scope is null or v_scope not in ('mine','everyone','circle') then raise exception using errcode='22023',message='Unsupported activity scope'; end if;
  if p_limit is null or p_limit not between 1 and 50 then raise exception using errcode='22023',message='Activity limit must be between 1 and 50'; end if;
  if (p_before_ended_at is null) <> (p_before_id is null) then raise exception using errcode='22023',message='Activity cursor is incomplete'; end if;
  if v_scope='circle' and (p_group_id is null or not exists(select 1 from public.group_members where group_id=p_group_id and user_id=v_user_id)) then
    raise exception using errcode='42501',message='Circle membership required';
  end if;
  select timezone into v_timezone from public.profiles where id=v_user_id; v_timezone:=coalesce(v_timezone,'UTC');
  with candidates as materialized (
    select s.id,s.user_id,s.ended_at,s.duration_seconds,s.rating,s.share_notes,s.notes,
      p.display_name,p.username::text username,p.avatar_url,
      coalesce(g.name,'Study session') goal_name
    from public.study_sessions s join public.profiles p on p.id=s.user_id
    left join public.study_goals g on g.id=s.goal_id and g.user_id=s.user_id
    where s.ended_at is not null and s.duration_seconds>0
      and (p_before_ended_at is null or (s.ended_at,s.id)<(p_before_ended_at,p_before_id))
      and ((v_scope='mine' and s.user_id=v_user_id) or v_scope='everyone' or
        (v_scope='circle' and exists(select 1 from public.group_members gm where gm.group_id=p_group_id and gm.user_id=s.user_id)))
    order by s.ended_at desc,s.id desc limit p_limit+1
  ), visible as (select * from candidates order by ended_at desc,id desc limit p_limit),
  cursor_row as (select ended_at,id from visible order by ended_at,id limit 1)
  select jsonb_build_object(
    'timezone',v_timezone,
    'items',coalesce((select jsonb_agg(jsonb_build_object(
      'id',v.id,'displayName',v.display_name,'username',v.username,'avatarPath',v.avatar_url,
      'goalName',v.goal_name,'durationSeconds',v.duration_seconds,
      'completedAt',date_trunc('minute',v.ended_at),'rating',v.rating,
      'sharedNotes',case when v.share_notes then v.notes else null end,
      'notesShared',v.share_notes and v.notes is not null,'isCurrentUser',v.user_id=v_user_id
    ) order by v.ended_at desc,v.id desc) from visible v),'[]'::jsonb),
    'nextCursor',case when(select count(*) from candidates)>p_limit then(select jsonb_build_object('endedAt',c.ended_at,'id',c.id) from cursor_row c) else null end
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.get_application_leaderboard(p_period text default 'week',p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=(select auth.uid()); tz text; today date; boundary timestamptz; result jsonb;
begin
 if u is null then raise exception using errcode='42501',message='Authentication required'; end if;
 if p_period is null then raise exception using errcode='22023',message='Leaderboard period is required'; end if;
 p_period:=lower(btrim(p_period));
 if p_period not in('today','week','month','all') then raise exception using errcode='22023',message='Unsupported leaderboard period'; end if;
 if p_limit is null or p_limit not between 1 and 100 then raise exception using errcode='22023',message='Leaderboard limit must be between 1 and 100'; end if;
 select timezone into tz from public.profiles where id=u; tz:=coalesce(tz,'UTC'); today:=(clock_timestamp() at time zone tz)::date;
 boundary:=case p_period when'today'then today::timestamp at time zone tz when'week'then(today-(extract(isodow from today)::int-1))::timestamp at time zone tz when'month'then date_trunc('month',today::timestamp)::timestamp at time zone tz else null end;
 with totals as (
  select s.user_id,sum(s.duration_seconds)::bigint seconds from public.study_sessions s where s.ended_at is not null and s.duration_seconds>0 and(boundary is null or s.started_at>=boundary) group by s.user_id
 ), ranked as (
  select p.id user_id,p.display_name,p.username::text username,p.avatar_url,t.seconds,dense_rank() over(order by t.seconds desc)::bigint rank from totals t join public.profiles p on p.id=t.user_id
 ), ordered as (
  select *,row_number() over(order by seconds desc,lower(username),user_id) stable_position from ranked
 ), visible as (select * from ordered order by stable_position limit p_limit), viewer as (
  select p.display_name,p.username::text username,p.avatar_url,coalesce(r.seconds,0)::bigint seconds,r.rank,exists(select 1 from visible v where v.user_id=p.id) included from public.profiles p left join ranked r on r.user_id=p.id where p.id=u
 )
 select jsonb_build_object('period',p_period,'timezone',tz,'totalParticipants',(select count(*) from ranked),
  'top',coalesce((select jsonb_agg(jsonb_build_object('displayName',v.display_name,'username',v.username,'avatarPath',v.avatar_url,'durationSeconds',v.seconds,'rank',v.rank,'isCurrentUser',v.user_id=u) order by v.stable_position) from visible v),'[]'::jsonb),
  'currentUser',(select jsonb_build_object('displayName',w.display_name,'username',w.username,'avatarPath',w.avatar_url,'durationSeconds',w.seconds,'rank',w.rank,'includedInTop',w.included) from viewer w)
 ) into result;
 return result;
end;
$$;

create or replace function public.get_study_group(p_group_id uuid,p_period text default 'week',p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=(select auth.uid()); tz text; today date; boundary timestamptz; result jsonb; user_role public.group_role;
begin
 if u is null then raise exception using errcode='42501',message='Authentication required'; end if;
 if p_group_id is null then raise exception using errcode='22023',message='Group is required'; end if;
 p_period:=lower(btrim(p_period));
 if p_period is null or p_period not in('today','week','month','all') then raise exception using errcode='22023',message='Unsupported leaderboard period'; end if;
 if p_limit is null or p_limit not between 1 and 100 then raise exception using errcode='22023',message='Leaderboard limit must be between 1 and 100'; end if;
 select role into user_role from public.group_members where group_id=p_group_id and user_id=u;
 if user_role is null then raise exception using errcode='42501',message='Group membership required'; end if;
 select timezone into tz from public.profiles where id=u; tz:=coalesce(tz,'UTC'); today:=(clock_timestamp() at time zone tz)::date;
 boundary:=case p_period when'today'then today::timestamp at time zone tz when'week'then(today-(extract(isodow from today)::int-1))::timestamp at time zone tz when'month'then date_trunc('month',today::timestamp)::timestamp at time zone tz else null end;
 with members as (
  select m.user_id,m.role,p.display_name,p.username::text username,p.avatar_url from public.group_members m join public.profiles p on p.id=m.user_id where m.group_id=p_group_id
 ), totals as (
  select m.user_id,coalesce(sum(s.duration_seconds) filter(where s.ended_at is not null and s.duration_seconds>0 and(boundary is null or s.started_at>=boundary)),0)::bigint seconds from members m left join public.study_sessions s on s.user_id=m.user_id group by m.user_id
 ), ranked as (
  select m.*,t.seconds,case when t.seconds>0 then dense_rank() over(order by case when t.seconds>0 then t.seconds end desc nulls last)::bigint end rank from members m join totals t using(user_id)
 ), visible as (select * from ranked order by(rank is null),rank,lower(username),user_id limit p_limit)
 select jsonb_build_object('id',g.id,'name',g.name,'role',user_role,'inviteToken',case when user_role='owner'then g.invite_code end,
  'memberCount',(select count(*) from members),'period',p_period,'timezone',tz,
  'members',(select jsonb_agg(jsonb_build_object('displayName',m.display_name,'username',m.username,'avatarPath',m.avatar_url,'role',m.role) order by(m.role='owner')desc,lower(m.username)) from members m),
  'leaderboard',(select jsonb_agg(jsonb_build_object('displayName',v.display_name,'username',v.username,'avatarPath',v.avatar_url,'durationSeconds',v.seconds,'rank',v.rank,'isCurrentUser',v.user_id=u) order by(v.rank is null),v.rank,lower(v.username)) from visible v)
 ) into result from public.groups g where g.id=p_group_id;
 return result;
end;
$$;

create or replace function public.get_study_analytics(p_scope text default 'mine',p_group_id uuid default null,p_range text default '30d',p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=(select auth.uid()); tz text; today date; start_date date; start_at timestamptz; end_at timestamptz; result jsonb;
begin
 if u is null then raise exception using errcode='42501',message='Authentication required'; end if;
 p_scope:=lower(btrim(p_scope)); p_range:=lower(btrim(p_range));
 if p_scope not in('mine','everyone','circle') then raise exception using errcode='22023',message='Unsupported analytics scope'; end if;
 if p_range not in('7d','30d','3m','6m','1y','all') then raise exception using errcode='22023',message='Unsupported analytics timeframe'; end if;
 if p_limit is null or p_limit not between 1 and 100 then raise exception using errcode='22023',message='Leaderboard limit must be between 1 and 100'; end if;
 if p_scope='circle' and(p_group_id is null or not exists(select 1 from public.group_members m where m.group_id=p_group_id and m.user_id=u)) then raise exception using errcode='42501',message='Circle membership required'; end if;
 select coalesce(p.timezone,'UTC') into tz from public.profiles p where p.id=u; tz:=coalesce(tz,'UTC'); today:=(clock_timestamp() at time zone tz)::date;
 start_date:=case p_range when'7d'then today-6 when'30d'then today-29 when'3m'then(today-interval'3 months')::date+1 when'6m'then(today-interval'6 months')::date+1 when'1y'then(today-interval'1 year')::date+1 else null end;
 start_at:=case when start_date is null then'-infinity'::timestamptz else start_date::timestamp at time zone tz end; end_at:=(today+1)::timestamp at time zone tz;
 with population as materialized (
  select p.id user_id,p.display_name,p.username::text username,p.avatar_url from public.profiles p where(p_scope='mine'and p.id=u)or p_scope='everyone'or(p_scope='circle'and exists(select 1 from public.group_members m where m.group_id=p_group_id and m.user_id=p.id))
 ), completed as materialized (
  select s.user_id,s.goal_id,s.started_at,s.ended_at,s.duration_seconds from public.study_sessions s join population p on p.user_id=s.user_id where s.ended_at is not null and s.duration_seconds>0 and s.started_at<end_at and s.ended_at>start_at
 ), first_day as (select coalesce(start_date,least(today,min((c.started_at at time zone tz)::date)),today)d from completed c),
 days as(select generate_series((select d from first_day),today,interval'1 day')::date d),
 daily as (
  select d.d,
    coalesce(sum(round(c.duration_seconds * greatest(0, extract(epoch from (
      least(c.ended_at, (d.d + 1)::timestamp at time zone tz)
      - greatest(c.started_at, d.d::timestamp at time zone tz)
    ))) / greatest(1, extract(epoch from (c.ended_at - c.started_at))))), 0)::bigint seconds
  from days d
  left join completed c
    on c.started_at < (d.d + 1)::timestamp at time zone tz
   and c.ended_at > d.d::timestamp at time zone tz
  group by d.d
 ),
 named_goals as(select c.user_id,coalesce(g.name,'General study')name,round(c.duration_seconds*greatest(0,extract(epoch from(least(c.ended_at,end_at)-greatest(c.started_at,start_at))))/greatest(1,extract(epoch from(c.ended_at-c.started_at))))::bigint seconds from completed c left join public.study_goals g on g.id=c.goal_id and g.user_id=c.user_id),
 goal_groups as(select name,sum(seconds)::bigint seconds,count(distinct user_id)::int contributors from named_goals group by name),
 safe_goals as(select case when p_scope='mine'or contributors>=2 then name else'Other study'end name,sum(seconds)::bigint seconds from goal_groups group by case when p_scope='mine'or contributors>=2 then name else'Other study'end),
 totals as(select p.user_id,p.display_name,p.username,p.avatar_url,coalesce(sum(round(c.duration_seconds*greatest(0,extract(epoch from(least(c.ended_at,end_at)-greatest(c.started_at,start_at))))/greatest(1,extract(epoch from(c.ended_at-c.started_at))))),0)::bigint seconds from population p left join completed c on c.user_id=p.user_id group by p.user_id,p.display_name,p.username,p.avatar_url),
 ranked as(select t.*,case when t.seconds>0 then dense_rank()over(order by t.seconds desc)::bigint end rank from totals t),
 visible as(select*from ranked order by(rank is null),rank,lower(username),user_id limit p_limit)
 select jsonb_build_object('scope',p_scope,'range',p_range,'timezone',tz,'totalSeconds',(select coalesce(sum(seconds),0)::bigint from safe_goals),
  'daily',(select coalesce(jsonb_agg(jsonb_build_object('date',d,'seconds',seconds)order by d),'[]'::jsonb)from daily),
  'goals',(select coalesce(jsonb_agg(jsonb_build_object('name',name,'seconds',seconds)order by seconds desc,name),'[]'::jsonb)from safe_goals where seconds>0),
  'leaderboard',case when p_scope='mine'then'[]'::jsonb else(select coalesce(jsonb_agg(jsonb_build_object('displayName',display_name,'username',username,'avatarPath',avatar_url,'durationSeconds',seconds,'rank',rank,'isCurrentUser',user_id=u)order by(rank is null),rank,lower(username)),'[]'::jsonb)from visible)end
 ) into result;
 return result;
end;
$$;

revoke all on function public.get_activity_feed(text,uuid,timestamptz,uuid,integer),public.get_application_leaderboard(text,integer),public.get_study_group(uuid,text,integer),public.get_study_analytics(text,uuid,text,integer) from public,anon;
grant execute on function public.get_activity_feed(text,uuid,timestamptz,uuid,integer),public.get_application_leaderboard(text,integer),public.get_study_group(uuid,text,integer),public.get_study_analytics(text,uuid,text,integer) to authenticated;

comment on column public.profiles.avatar_url is 'Relative object path in the public avatars Storage bucket; URLs are derived at render time.';
