create or replace function public.get_study_analytics(p_scope text default'mine',p_group_id uuid default null,p_range text default'30d',p_limit integer default 50)
returns jsonb language plpgsql volatile security definer set search_path=''as $$
declare u uuid:=(select auth.uid());tz text;today date;start_date date;start_at timestamptz;end_at timestamptz;result jsonb;
begin
 if u is null then raise exception using errcode='42501',message='Authentication required';end if;
 p_scope:=lower(btrim(p_scope));p_range:=lower(btrim(p_range));
 if p_scope<>'mine'or p_group_id is not null then raise exception using errcode='22023',message='Unsupported analytics scope';end if;
 if p_limit is null or p_limit not between 1 and 100 then raise exception using errcode='22023',message='Analytics limit must be between 1 and 100';end if;
 if p_range not in('7d','30d','3m','6m','1y','all')then raise exception using errcode='22023',message='Unsupported analytics timeframe';end if;
 select coalesce(p.timezone,'UTC')into tz from public.profiles p where p.id=u;today:=(clock_timestamp()at time zone tz)::date;
 start_date:=private.analytics_start_date(p_range,today);start_at:=case when start_date is null then'-infinity'::timestamptz else start_date::timestamp at time zone tz end;end_at:=(today+1)::timestamp at time zone tz;
 with completed as materialized(
  select s.id,s.goal_id,s.ended_at,s.duration_seconds,coalesce(g.name,'Legacy session')goal_name
  from public.study_sessions s left join public.study_goals g on g.id=s.goal_id and g.user_id=s.user_id
  where s.user_id=u and s.ended_at is not null and s.duration_seconds>0 and s.ended_at>=start_at and s.ended_at<end_at
 ),first_day as(select coalesce(start_date,least(today,min((c.ended_at at time zone tz)::date)),today)d from completed c),
 days as(select generate_series((select d from first_day),today,interval'1 day')::date d),
 daily as(select d.d,coalesce(sum(c.duration_seconds),0)::bigint seconds from days d left join completed c on(c.ended_at at time zone tz)::date=d.d group by d.d),
 daily_goals as(select(c.ended_at at time zone tz)::date d,c.goal_id,c.goal_name,sum(c.duration_seconds)::bigint seconds from completed c group by(c.ended_at at time zone tz)::date,c.goal_id,c.goal_name),
 goals as(select c.goal_id,c.goal_name name,sum(c.duration_seconds)::bigint seconds from completed c group by c.goal_id,c.goal_name)
 select jsonb_build_object('scope','mine','range',p_range,'timezone',tz,'totalSeconds',(select coalesce(sum(duration_seconds),0)::bigint from completed),
  'daily',(select coalesce(jsonb_agg(jsonb_build_object('date',d.d,'seconds',d.seconds,'goals',
   (select coalesce(jsonb_agg(jsonb_build_object('name',dg.goal_name,'seconds',dg.seconds)order by dg.seconds desc,dg.goal_name),'[]'::jsonb)from daily_goals dg where dg.d=d.d))order by d.d),'[]'::jsonb)from daily d),
  'goals',(select coalesce(jsonb_agg(jsonb_build_object('name',g.name,'seconds',g.seconds)order by g.seconds desc,g.name),'[]'::jsonb)from goals g),
  'leaderboard','[]'::jsonb,'members','[]'::jsonb)into result;return result;
end;
$$;
