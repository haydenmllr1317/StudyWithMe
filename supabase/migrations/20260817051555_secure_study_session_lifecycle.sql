-- Session timestamps are authoritative database values. Authenticated clients
-- can read their rows, but lifecycle writes go through the functions below.
revoke insert, update, delete on public.study_sessions from authenticated;

create function public.start_study_session(
  p_goal_id uuid,
  p_session_type public.session_type
)
returns public.study_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_session public.study_sessions;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_session_type not in ('normal'::public.session_type, 'pomodoro'::public.session_type) then
    raise exception using errcode = '22023', message = 'Unsupported session type';
  end if;

  if not exists (
    select 1 from public.study_goals
    where id = p_goal_id and user_id = v_user_id and is_archived = false
  ) then
    raise exception using errcode = '22023', message = 'Choose one of your active study goals';
  end if;

  insert into public.study_sessions (user_id, goal_id, started_at, session_type)
  values (v_user_id, p_goal_id, clock_timestamp(), p_session_type)
  returning * into v_session;

  return v_session;
exception
  when unique_violation then
    raise exception using errcode = 'P0001', message = 'An active study session already exists';
end;
$$;

create function public.finish_study_session(p_session_id uuid)
returns public.study_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_session public.study_sessions;
  v_ended_at timestamptz;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select * into v_session
  from public.study_sessions
  where id = p_session_id and user_id = v_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Study session not found';
  end if;

  if v_session.ended_at is not null then
    return v_session;
  end if;

  v_ended_at := clock_timestamp();
  update public.study_sessions
  set ended_at = v_ended_at,
      duration_seconds = floor(extract(epoch from (v_ended_at - started_at)))::integer
  where id = p_session_id
  returning * into v_session;

  return v_session;
end;
$$;

create function public.update_study_session_reflection(
  p_session_id uuid,
  p_notes text,
  p_rating smallint
)
returns public.study_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_session public.study_sessions;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_notes is not null and char_length(p_notes) > 5000 then
    raise exception using errcode = '22001', message = 'Notes must be 5000 characters or fewer';
  end if;
  if p_rating is not null and p_rating not between 1 and 5 then
    raise exception using errcode = '22023', message = 'Rating must be between 1 and 5';
  end if;

  update public.study_sessions
  set notes = nullif(btrim(p_notes), ''), rating = p_rating
  where id = p_session_id and user_id = v_user_id and ended_at is not null
  returning * into v_session;

  if not found then
    raise exception using errcode = 'P0002', message = 'Completed study session not found';
  end if;
  return v_session;
end;
$$;

create function public.get_today_study_summary()
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

  select timezone into v_timezone from public.profiles where id = v_user_id;
  v_timezone := coalesce(v_timezone, 'UTC');
  v_local_date := (clock_timestamp() at time zone v_timezone)::date;
  v_day_start := v_local_date::timestamp at time zone v_timezone;
  v_day_end := (v_local_date + 1)::timestamp at time zone v_timezone;

  return query
  select s.goal_id,
         sum(floor(extract(epoch from (
           least(s.ended_at, v_day_end) - greatest(s.started_at, v_day_start)
         )))::bigint)::bigint
  from public.study_sessions s
  where s.user_id = v_user_id
    and s.ended_at is not null
    and s.started_at < v_day_end
    and s.ended_at > v_day_start
  group by s.goal_id;
end;
$$;

revoke all on function public.start_study_session(uuid, public.session_type) from public, anon;
revoke all on function public.finish_study_session(uuid) from public, anon;
revoke all on function public.update_study_session_reflection(uuid, text, smallint) from public, anon;
revoke all on function public.get_today_study_summary() from public, anon;
grant execute on function public.start_study_session(uuid, public.session_type) to authenticated;
grant execute on function public.finish_study_session(uuid) to authenticated;
grant execute on function public.update_study_session_reflection(uuid, text, smallint) to authenticated;
grant execute on function public.get_today_study_summary() to authenticated;

comment on function public.start_study_session(uuid, public.session_type) is 'Starts one owned session using an authoritative database timestamp.';
comment on function public.finish_study_session(uuid) is 'Idempotently finishes an owned session and derives duration from database timestamps.';
comment on function public.get_today_study_summary() is 'Returns completed duration clipped to the authenticated user local calendar day.';
