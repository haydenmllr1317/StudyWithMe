alter table public.study_sessions
add column share_notes boolean not null default false;

create index study_sessions_activity_cursor_idx
on public.study_sessions (ended_at desc, id desc)
include (user_id, goal_id, duration_seconds, rating, share_notes)
where ended_at is not null and duration_seconds > 0;

create index study_sessions_user_activity_cursor_idx
on public.study_sessions (user_id, ended_at desc, id desc)
include (goal_id, duration_seconds, rating, share_notes)
where ended_at is not null and duration_seconds > 0;

create or replace function public.update_study_session_reflection(
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
  set notes = nullif(btrim(p_notes), ''),
      rating = p_rating,
      share_notes = false
  where id = p_session_id and user_id = v_user_id and ended_at is not null
  returning * into v_session;

  if not found then
    raise exception using errcode = 'P0002', message = 'Completed study session not found';
  end if;
  return v_session;
end;
$$;

create function public.update_study_session_reflection(
  p_session_id uuid,
  p_notes text,
  p_rating smallint,
  p_share_notes boolean
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
  set notes = nullif(btrim(p_notes), ''),
      rating = p_rating,
      share_notes = coalesce(p_share_notes, false)
  where id = p_session_id and user_id = v_user_id and ended_at is not null
  returning * into v_session;

  if not found then
    raise exception using errcode = 'P0002', message = 'Completed study session not found';
  end if;
  return v_session;
end;
$$;

create function public.get_activity_feed(
  p_scope text default 'everyone',
  p_group_id uuid default null,
  p_before_ended_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_scope text := lower(btrim(p_scope));
  v_timezone text;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if v_scope is null or v_scope not in ('mine', 'everyone', 'circle') then
    raise exception using errcode = '22023', message = 'Unsupported activity scope';
  end if;
  if p_limit is null or p_limit not between 1 and 50 then
    raise exception using errcode = '22023', message = 'Activity limit must be between 1 and 50';
  end if;
  if (p_before_ended_at is null) <> (p_before_id is null) then
    raise exception using errcode = '22023', message = 'Activity cursor is incomplete';
  end if;
  if v_scope = 'circle' then
    if p_group_id is null or not exists (
      select 1 from public.group_members
      where group_id = p_group_id and user_id = v_user_id
    ) then
      raise exception using errcode = '42501', message = 'Circle membership required';
    end if;
  end if;
  select timezone into v_timezone from public.profiles where id = v_user_id;
  v_timezone := coalesce(v_timezone, 'UTC');

  with candidates as materialized (
    select
      s.id,
      s.user_id,
      s.ended_at,
      s.duration_seconds,
      s.rating,
      s.share_notes,
      s.notes,
      p.display_name,
      p.username::text as username,
      coalesce(g.name, 'Study session') as goal_name
    from public.study_sessions s
    join public.profiles p on p.id = s.user_id
    left join public.study_goals g on g.id = s.goal_id and g.user_id = s.user_id
    where s.ended_at is not null
      and s.duration_seconds > 0
      and (p_before_ended_at is null or (s.ended_at, s.id) < (p_before_ended_at, p_before_id))
      and (
        (v_scope = 'mine' and s.user_id = v_user_id)
        or v_scope = 'everyone'
        or (v_scope = 'circle' and exists (
          select 1 from public.group_members gm
          where gm.group_id = p_group_id and gm.user_id = s.user_id
        ))
      )
    order by s.ended_at desc, s.id desc
    limit p_limit + 1
  ), visible as (
    select * from candidates order by ended_at desc, id desc limit p_limit
  ), cursor_row as (
    select ended_at, id from visible order by ended_at, id limit 1
  )
  select jsonb_build_object(
    'timezone', v_timezone,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', v.id,
        'displayName', v.display_name,
        'username', v.username,
        'goalName', v.goal_name,
        'durationSeconds', v.duration_seconds,
        'completedAt', date_trunc('minute', v.ended_at),
        'rating', v.rating,
        'sharedNotes', case when v.share_notes then v.notes else null end,
        'notesShared', v.share_notes and v.notes is not null,
        'isCurrentUser', v.user_id = v_user_id
      ) order by v.ended_at desc, v.id desc)
      from visible v
    ), '[]'::jsonb),
    'nextCursor', case when (select count(*) from candidates) > p_limit then (
      select jsonb_build_object('endedAt', c.ended_at, 'id', c.id) from cursor_row c
    ) else null end
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.update_study_session_reflection(uuid, text, smallint, boolean) from public, anon;
grant execute on function public.update_study_session_reflection(uuid, text, smallint, boolean) to authenticated;

revoke all on function public.get_activity_feed(text, uuid, timestamptz, uuid, integer) from public, anon;
grant execute on function public.get_activity_feed(text, uuid, timestamptz, uuid, integer) to authenticated;

comment on column public.study_sessions.share_notes is
  'Owner-controlled flag allowing the current notes value to appear in authenticated Activity projections.';
comment on function public.get_activity_feed(text, uuid, timestamptz, uuid, integer) is
  'Returns a paginated feed-safe projection of completed study sessions. Circle scope requires current membership; raw session rows remain owner-only.';
