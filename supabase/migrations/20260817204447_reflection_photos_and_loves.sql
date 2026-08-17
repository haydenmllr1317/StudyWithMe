alter table public.study_sessions
add column reflection_photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reflection-photos', 'reflection-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create function private.can_read_reflection_photo(object_name text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.study_sessions s
    where s.reflection_photo_path=object_name
      and s.share_notes=true and s.ended_at is not null and s.duration_seconds>0
  );
$$;
revoke all on function private.can_read_reflection_photo(text) from public,anon;
grant execute on function private.can_read_reflection_photo(text) to authenticated;

create policy "Owners can upload reflection photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'reflection-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.study_sessions s
    where s.id::text = (storage.foldername(name))[2]
      and s.user_id = (select auth.uid())
      and s.ended_at is not null
  )
);

create policy "Visible reflection photos can be read"
on storage.objects for select to authenticated
using (
  bucket_id = 'reflection-photos'
  and (
    owner_id = (select auth.uid())::text
    or (select private.can_read_reflection_photo(name))
  )
);

create policy "Owners can delete reflection photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'reflection-photos'
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create or replace function public.enforce_reflection_photo_path()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.reflection_photo_path is not null and (
    split_part(new.reflection_photo_path, '/', 1) <> new.user_id::text
    or split_part(new.reflection_photo_path, '/', 2) <> new.id::text
    or new.reflection_photo_path !~* '^[0-9a-f-]{36}/[0-9a-f-]{36}/reflection-[0-9a-f-]{36}\.(jpe?g|png|webp)$'
  ) then
    raise exception using errcode='23514', message='Reflection photo path must belong to the session owner';
  end if;
  return new;
end;
$$;

create trigger study_sessions_enforce_reflection_photo_path
before insert or update of reflection_photo_path on public.study_sessions
for each row execute function public.enforce_reflection_photo_path();
revoke all on function public.enforce_reflection_photo_path() from public, anon, authenticated;

create table public.session_loves (
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (session_id, user_id)
);
create index session_loves_user_id_idx on public.session_loves(user_id, created_at desc);
alter table public.session_loves enable row level security;
revoke all on public.session_loves from public, anon, authenticated;

create function public.toggle_session_love(p_session_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare u uuid := (select auth.uid()); affected integer;
begin
  if u is null then raise exception using errcode='42501', message='Authentication required'; end if;
  if not exists (
    select 1 from public.study_sessions s
    where s.id=p_session_id and s.user_id<>u and s.ended_at is not null and s.duration_seconds>0
  ) then raise exception using errcode='42501', message='Session is not available to love'; end if;
  delete from public.session_loves where session_id=p_session_id and user_id=u;
  if found then return false; end if;
  insert into public.session_loves(session_id,user_id) values(p_session_id,u)
  on conflict do nothing;
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;
revoke all on function public.toggle_session_love(uuid) from public, anon;
grant execute on function public.toggle_session_love(uuid) to authenticated;

create function public.get_visible_reflection_photo(p_session_id uuid)
returns text language sql stable security definer set search_path='' as $$
  select s.reflection_photo_path from public.study_sessions s
  where s.id=p_session_id and s.reflection_photo_path is not null
    and (s.user_id=(select auth.uid()) or (s.share_notes=true and s.ended_at is not null and s.duration_seconds>0));
$$;
revoke all on function public.get_visible_reflection_photo(uuid) from public,anon;
grant execute on function public.get_visible_reflection_photo(uuid) to authenticated;

create function public.update_study_session_reflection(
  p_session_id uuid, p_notes text, p_rating smallint,
  p_share_notes boolean, p_reflection_photo_path text
)
returns public.study_sessions language plpgsql security definer set search_path = '' as $$
declare u uuid := (select auth.uid()); s public.study_sessions;
begin
  if u is null then raise exception using errcode='42501',message='Authentication required'; end if;
  if p_notes is not null and char_length(p_notes)>5000 then raise exception using errcode='22001',message='Notes must be 5000 characters or fewer'; end if;
  if p_rating is not null and p_rating not between 1 and 5 then raise exception using errcode='22023',message='Rating must be between 1 and 5'; end if;
  if p_reflection_photo_path is not null and (
    split_part(p_reflection_photo_path,'/',1)<>u::text
    or split_part(p_reflection_photo_path,'/',2)<>p_session_id::text
  ) then raise exception using errcode='42501',message='Reflection photo path is not owned by this session'; end if;
  update public.study_sessions set notes=nullif(btrim(p_notes),''),rating=p_rating,
    share_notes=coalesce(p_share_notes,false),reflection_photo_path=p_reflection_photo_path
  where id=p_session_id and user_id=u and ended_at is not null returning * into s;
  if not found then raise exception using errcode='P0002',message='Completed study session not found'; end if;
  return s;
end;
$$;
revoke all on function public.update_study_session_reflection(uuid,text,smallint,boolean,text) from public,anon;
grant execute on function public.update_study_session_reflection(uuid,text,smallint,boolean,text) to authenticated;

create or replace function public.get_activity_feed(
  p_scope text default 'everyone',p_group_id uuid default null,
  p_before_ended_at timestamptz default null,p_before_id uuid default null,p_limit integer default 20
)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=(select auth.uid()); scope text:=lower(btrim(p_scope)); tz text; result jsonb;
begin
 if u is null then raise exception using errcode='42501',message='Authentication required'; end if;
 if scope is null or scope not in('mine','everyone','circle') then raise exception using errcode='22023',message='Unsupported activity scope'; end if;
 if p_limit is null or p_limit not between 1 and 50 then raise exception using errcode='22023',message='Activity limit must be between 1 and 50'; end if;
 if(p_before_ended_at is null)<>(p_before_id is null)then raise exception using errcode='22023',message='Activity cursor is incomplete'; end if;
 if scope='circle' and(p_group_id is null or not exists(select 1 from public.group_members where group_id=p_group_id and user_id=u))then raise exception using errcode='42501',message='Circle membership required'; end if;
 select timezone into tz from public.profiles where id=u;tz:=coalesce(tz,'UTC');
 with candidates as materialized(
  select s.id,s.user_id,s.ended_at,s.duration_seconds,s.rating,s.share_notes,s.notes,s.reflection_photo_path,
   p.display_name,p.username::text username,p.avatar_url,coalesce(g.name,'Study session')goal_name,
   (select count(*)::int from public.session_loves l where l.session_id=s.id)love_count,
   exists(select 1 from public.session_loves l where l.session_id=s.id and l.user_id=u)is_loved
  from public.study_sessions s join public.profiles p on p.id=s.user_id left join public.study_goals g on g.id=s.goal_id and g.user_id=s.user_id
  where s.ended_at is not null and s.duration_seconds>0 and(p_before_ended_at is null or(s.ended_at,s.id)<(p_before_ended_at,p_before_id))and(
   (scope='mine'and s.user_id=u)or scope='everyone'or(scope='circle'and exists(select 1 from public.group_members gm where gm.group_id=p_group_id and gm.user_id=s.user_id)))
  order by s.ended_at desc,s.id desc limit p_limit+1
 ),visible as(select*from candidates order by ended_at desc,id desc limit p_limit),cursor_row as(select ended_at,id from visible order by ended_at,id limit 1)
 select jsonb_build_object('timezone',tz,'items',coalesce((select jsonb_agg(jsonb_build_object(
  'id',v.id,'displayName',v.display_name,'username',v.username,'avatarPath',v.avatar_url,'goalName',v.goal_name,
  'durationSeconds',v.duration_seconds,'completedAt',date_trunc('minute',v.ended_at),'rating',v.rating,
  'sharedNotes',case when v.share_notes then v.notes end,'reflectionPhotoPath',case when v.share_notes then v.reflection_photo_path end,
  'notesShared',v.share_notes and(v.notes is not null or v.reflection_photo_path is not null),'loveCount',v.love_count,'isLoved',v.is_loved,
  'canLove',v.user_id<>u,'isCurrentUser',v.user_id=u)order by v.ended_at desc,v.id desc)from visible v),'[]'::jsonb),
  'nextCursor',case when(select count(*)from candidates)>p_limit then(select jsonb_build_object('endedAt',c.ended_at,'id',c.id)from cursor_row c)end)into result;
 return result;
end;
$$;
revoke all on function public.get_activity_feed(text,uuid,timestamptz,uuid,integer) from public,anon;
grant execute on function public.get_activity_feed(text,uuid,timestamptz,uuid,integer) to authenticated;

comment on column public.study_sessions.reflection_photo_path is 'Private reflection-photos object path; socially readable only while share_notes is true.';
comment on table public.session_loves is 'One authenticated love per user and completed visible session; exposed only through controlled RPCs.';
