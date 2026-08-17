revoke delete on public.study_goals from authenticated;

create or replace function public.start_study_session(
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

  perform 1 from public.study_goals
  where id = p_goal_id and user_id = v_user_id and is_archived = false
  for key share;
  if not found then
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

create function public.delete_unused_study_goal(p_goal_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_deleted_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  perform 1 from public.study_goals
  where id = p_goal_id and user_id = v_user_id and is_archived = true
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Archived study goal not found';
  end if;
  if exists (select 1 from public.study_sessions where goal_id = p_goal_id and user_id = v_user_id) then
    raise exception using errcode = '23503', message = 'A goal with study history cannot be deleted';
  end if;

  delete from public.study_goals where id = p_goal_id and user_id = v_user_id
  returning id into v_deleted_id;
  return v_deleted_id;
end;
$$;

revoke all on function public.delete_unused_study_goal(uuid) from public, anon;
grant execute on function public.delete_unused_study_goal(uuid) to authenticated;
comment on function public.delete_unused_study_goal(uuid) is 'Atomically deletes an owned archived goal only when it has no session history.';
