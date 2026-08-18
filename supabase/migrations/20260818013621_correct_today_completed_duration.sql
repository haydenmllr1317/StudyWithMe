-- Today uses the stored, pause-adjusted duration as its source of truth. For a
-- session crossing local midnight, allocate that duration proportionally to
-- the portion of the wall-clock interval that overlaps today.
create or replace function public.get_today_study_summary()
returns table (goal_id uuid, duration_seconds bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_timezone text;
  v_local_date date;
  v_day_start timestamptz;
  v_day_end timestamptz;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select p.timezone into v_timezone
  from public.profiles p
  where p.id = v_user_id;
  v_timezone := coalesce(v_timezone, 'UTC');
  v_local_date := (clock_timestamp() at time zone v_timezone)::date;
  v_day_start := v_local_date::timestamp at time zone v_timezone;
  v_day_end := (v_local_date + 1)::timestamp at time zone v_timezone;

  return query
  select
    s.goal_id,
    sum(round(
      s.duration_seconds * greatest(0, extract(epoch from (
        least(s.ended_at, v_day_end) - greatest(s.started_at, v_day_start)
      ))) / greatest(1, extract(epoch from (s.ended_at - s.started_at)))
    ))::bigint
  from public.study_sessions s
  where s.user_id = v_user_id
    and s.ended_at is not null
    and s.duration_seconds > 0
    and s.started_at < v_day_end
    and s.ended_at > v_day_start
  group by s.goal_id;
end;
$$;

revoke all on function public.get_today_study_summary() from public, anon;
grant execute on function public.get_today_study_summary() to authenticated;

comment on function public.get_today_study_summary() is
  'Returns pause-adjusted completed duration clipped to the authenticated user local calendar day.';
