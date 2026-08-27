-- The application defines a calendar week as Monday through Sunday in the
-- authenticated user's profile timezone. Pause-adjusted sessions crossing the
-- boundary are allocated in the same way as the Today summary.
create function public.get_weekly_study_summary()
returns table (goal_id uuid, duration_seconds bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_timezone text;
  v_today date;
  v_week_start timestamptz;
  v_week_end timestamptz;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select p.timezone into v_timezone
  from public.profiles p
  where p.id = v_user_id;
  v_timezone := coalesce(v_timezone, 'UTC');
  v_today := (clock_timestamp() at time zone v_timezone)::date;
  v_week_start := (v_today - (extract(isodow from v_today)::integer - 1))::timestamp at time zone v_timezone;
  v_week_end := (v_today + (8 - extract(isodow from v_today)::integer))::timestamp at time zone v_timezone;

  return query
  select
    s.goal_id,
    sum(round(
      s.duration_seconds * greatest(0, extract(epoch from (
        least(s.ended_at, v_week_end) - greatest(s.started_at, v_week_start)
      ))) / greatest(1, extract(epoch from (s.ended_at - s.started_at)))
    ))::bigint
  from public.study_sessions s
  where s.user_id = v_user_id
    and s.ended_at is not null
    and s.duration_seconds > 0
    and s.started_at < v_week_end
    and s.ended_at > v_week_start
  group by s.goal_id;
end;
$$;

revoke all on function public.get_weekly_study_summary() from public, anon;
grant execute on function public.get_weekly_study_summary() to authenticated;

comment on function public.get_weekly_study_summary() is
  'Returns pause-adjusted completed duration clipped to the authenticated user local Monday-through-Sunday week.';

-- The current date is intentionally evaluated on every call.
alter function public.get_weekly_study_summary() volatile;
