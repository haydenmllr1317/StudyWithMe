create or replace function public.get_application_leaderboard(
  p_period text default 'week',
  p_limit integer default 50
)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_user_id uuid := (select auth.uid());
  v_timezone text;
  v_today date;
  v_period_start timestamptz;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_period is null then
    raise exception using errcode = '22023', message = 'Leaderboard period is required';
  end if;
  p_period := lower(btrim(p_period));
  if p_period not in ('today', 'week', 'month', 'all') then
    raise exception using errcode = '22023', message = 'Unsupported leaderboard period';
  end if;
  if p_limit is null or p_limit not between 1 and 100 then
    raise exception using errcode = '22023', message = 'Leaderboard limit must be between 1 and 100';
  end if;

  select timezone into v_timezone from public.profiles where id = v_user_id;
  v_timezone := coalesce(v_timezone, 'UTC');
  v_today := (clock_timestamp() at time zone v_timezone)::date;
  v_period_start := case p_period
    when 'today' then v_today::timestamp at time zone v_timezone
    when 'week' then (v_today - (extract(isodow from v_today)::integer - 1))::timestamp at time zone v_timezone
    when 'month' then date_trunc('month', v_today::timestamp)::timestamp at time zone v_timezone
    else null
  end;

  with totals as (
    select s.user_id, sum(s.duration_seconds)::bigint as duration_seconds
    from public.study_sessions s
    where s.ended_at is not null and s.duration_seconds > 0
      and (v_period_start is null or s.started_at >= v_period_start)
    group by s.user_id
  ),
  ranked as (
    select p.id as user_id, p.display_name, p.username::text as username,
      p.avatar_url, t.duration_seconds,
      dense_rank() over (order by t.duration_seconds desc)::bigint as rank
    from totals t join public.profiles p on p.id = t.user_id
  ),
  ordered as (
    select *, row_number() over (order by duration_seconds desc, lower(username), user_id) as stable_position
    from ranked
  ),
  visible as (select * from ordered order by stable_position limit p_limit),
  viewer as (
    select p.id as user_id, p.display_name, p.username::text as username,
      p.avatar_url, coalesce(r.duration_seconds, 0)::bigint as duration_seconds,
      r.rank, exists (select 1 from visible v where v.user_id = p.id) as included_in_top
    from public.profiles p left join ranked r on r.user_id = p.id
    where p.id = v_user_id
  )
  select jsonb_build_object(
    'period', p_period,
    'timezone', v_timezone,
    'totalParticipants', (select count(*) from ranked),
    'top', coalesce((select jsonb_agg(jsonb_build_object(
      'userId', v.user_id, 'displayName', v.display_name, 'username', v.username,
      'avatarUrl', v.avatar_url, 'durationSeconds', v.duration_seconds,
      'rank', v.rank, 'isCurrentUser', v.user_id = v_user_id
    ) order by v.stable_position) from visible v), '[]'::jsonb),
    'currentUser', (select jsonb_build_object(
      'userId', w.user_id, 'displayName', w.display_name, 'username', w.username,
      'avatarUrl', w.avatar_url, 'durationSeconds', w.duration_seconds,
      'rank', w.rank, 'includedInTop', w.included_in_top
    ) from viewer w)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.get_application_leaderboard(text, integer) from public, anon;
grant execute on function public.get_application_leaderboard(text, integer) to authenticated;
