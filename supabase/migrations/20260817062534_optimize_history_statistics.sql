create or replace function public.get_personal_history_stats(p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid := (select auth.uid()); tz text; today date; range_start timestamptz; result jsonb;
begin
 if u is null then raise exception using errcode='42501', message='Authentication required'; end if;
 select timezone into tz from public.profiles where id=u; tz:=coalesce(tz,'UTC'); today:=(clock_timestamp() at time zone tz)::date;
 range_start:=case when p_days is null then '-infinity'::timestamptz else (today-(p_days-1))::timestamp at time zone tz end;
 with completed as materialized (select goal_id,started_at,ended_at,duration_seconds from public.study_sessions where user_id=u and ended_at is not null),
 days as (select generate_series(today-29,today,'1 day')::date d),
 daily as (select d.d,coalesce(sum(floor(extract(epoch from(least(s.ended_at,(d.d+1)::timestamp at time zone tz)-greatest(s.started_at,d.d::timestamp at time zone tz))))),0)::bigint seconds from days d left join completed s on s.started_at<(d.d+1)::timestamp at time zone tz and s.ended_at>d.d::timestamp at time zone tz group by d.d order by d.d),
 qualifying as (select distinct (started_at at time zone tz)::date d from completed where duration_seconds>0),
 anchor as (select case when exists(select 1 from qualifying where d=today) then today else today-1 end d),
 ordered_streak as (select q.d,row_number() over(order by q.d desc) rn from qualifying q,anchor a where q.d<=a.d),
 streak as (select count(*)::int n from ordered_streak o,anchor a where o.d=a.d-(o.rn::int-1)),
 totals as (select coalesce(sum(duration_seconds) filter(where started_at>=today::timestamp at time zone tz),0)::bigint today_s,coalesce(sum(duration_seconds) filter(where started_at>=(today-(extract(isodow from today)::int-1))::timestamp at time zone tz),0)::bigint week_s,coalesce(sum(duration_seconds) filter(where started_at>=date_trunc('month',today::timestamp)::timestamp at time zone tz),0)::bigint month_s,coalesce(sum(duration_seconds),0)::bigint all_s from completed),
 breakdown as (select s.goal_id,coalesce(g.name,'Study session') name,sum(s.duration_seconds)::bigint seconds from completed s left join public.study_goals g on g.id=s.goal_id and g.user_id=u where s.started_at>=range_start group by s.goal_id,g.name order by seconds desc)
 select jsonb_build_object('today',t.today_s,'week',t.week_s,'month',t.month_s,'allTime',t.all_s,'streak',(select n from streak),'daily',(select jsonb_agg(jsonb_build_object('date',d,'seconds',seconds)) from daily),'goals',(select coalesce(jsonb_agg(jsonb_build_object('goalId',goal_id,'name',name,'seconds',seconds)),'[]'::jsonb) from breakdown)) into result from totals t;
 return result;
end $$;

revoke all on function public.get_personal_history_stats(integer) from public,anon;
grant execute on function public.get_personal_history_stats(integer) to authenticated;
