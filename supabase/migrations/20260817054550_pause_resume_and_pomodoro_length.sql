alter table public.study_sessions
  add column paused_at timestamptz,
  add column paused_seconds integer not null default 0 check (paused_seconds >= 0),
  add column pomodoro_minutes smallint check (pomodoro_minutes is null or pomodoro_minutes in (25, 50));
update public.study_sessions set pomodoro_minutes = 25 where session_type = 'pomodoro';
alter table public.study_sessions add constraint study_sessions_pomodoro_length_check check ((session_type='normal' and pomodoro_minutes is null) or (session_type='pomodoro' and pomodoro_minutes in (25,50)));
alter table public.study_sessions drop constraint study_sessions_timing_check;
alter table public.study_sessions add constraint study_sessions_timing_check check (
 (ended_at is null and duration_seconds is null)
 or (ended_at is not null and ended_at >= started_at and paused_at is null and duration_seconds = greatest(0,floor(extract(epoch from (ended_at-started_at)))::integer-paused_seconds))
);

drop function public.start_study_session(uuid, public.session_type);
create function public.start_study_session(p_goal_id uuid,p_session_type public.session_type,p_pomodoro_minutes smallint default null)
returns public.study_sessions language plpgsql security definer set search_path='' as $$
declare u uuid := (select auth.uid()); s public.study_sessions;
begin
 if u is null then raise exception using errcode='42501',message='Authentication required'; end if;
 if (p_session_type='normal' and p_pomodoro_minutes is not null) or (p_session_type='pomodoro' and p_pomodoro_minutes not in (25,50)) then raise exception using errcode='22023',message='Choose a valid session length'; end if;
 perform 1 from public.study_goals where id=p_goal_id and user_id=u and is_archived=false for key share;
 if not found then raise exception using errcode='22023',message='Choose one of your active study goals'; end if;
 insert into public.study_sessions(user_id,goal_id,started_at,session_type,pomodoro_minutes) values(u,p_goal_id,clock_timestamp(),p_session_type,p_pomodoro_minutes) returning * into s; return s;
exception when unique_violation then raise exception using errcode='P0001',message='An active study session already exists'; end $$;

create or replace function public.finish_study_session(p_session_id uuid) returns public.study_sessions language plpgsql security definer set search_path='' as $$
declare u uuid := (select auth.uid()); s public.study_sessions; e timestamptz; paused integer;
begin
 if u is null then raise exception using errcode='42501',message='Authentication required'; end if;
 select * into s from public.study_sessions where id=p_session_id and user_id=u for update;
 if not found then raise exception using errcode='P0002',message='Study session not found'; end if; if s.ended_at is not null then return s; end if;
 e:=clock_timestamp(); paused:=s.paused_seconds+case when s.paused_at is null then 0 else floor(extract(epoch from(e-s.paused_at)))::integer end;
 update public.study_sessions set ended_at=e,paused_at=null,paused_seconds=paused,duration_seconds=greatest(0,floor(extract(epoch from(e-started_at)))::integer-paused) where id=p_session_id returning * into s; return s;
end $$;

create function public.pause_study_session(p_session_id uuid) returns public.study_sessions language plpgsql security definer set search_path='' as $$
declare u uuid := (select auth.uid()); s public.study_sessions; begin if u is null then raise exception using errcode='42501',message='Authentication required'; end if; update public.study_sessions set paused_at=clock_timestamp() where id=p_session_id and user_id=u and ended_at is null and paused_at is null returning * into s; if not found then raise exception using errcode='P0001',message='Session is already paused or unavailable'; end if; return s; end $$;
create function public.resume_study_session(p_session_id uuid) returns public.study_sessions language plpgsql security definer set search_path='' as $$
declare u uuid := (select auth.uid()); s public.study_sessions; n timestamptz:=clock_timestamp(); begin if u is null then raise exception using errcode='42501',message='Authentication required'; end if; update public.study_sessions set paused_seconds=paused_seconds+floor(extract(epoch from(n-paused_at)))::integer,paused_at=null where id=p_session_id and user_id=u and ended_at is null and paused_at is not null returning * into s; if not found then raise exception using errcode='P0001',message='Session is already running or unavailable'; end if; return s; end $$;

revoke all on function public.start_study_session(uuid,public.session_type,smallint),public.pause_study_session(uuid),public.resume_study_session(uuid) from public,anon;
grant execute on function public.start_study_session(uuid,public.session_type,smallint),public.pause_study_session(uuid),public.resume_study_session(uuid) to authenticated;
