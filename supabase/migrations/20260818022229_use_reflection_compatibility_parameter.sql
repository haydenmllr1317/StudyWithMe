create or replace function public.update_study_session_reflection(
  p_session_id uuid,p_notes text,p_rating smallint,p_share_notes boolean,
  p_reflection_photo_path text,p_activity_audience text,p_group_ids uuid[] default '{}'::uuid[]
)
returns public.study_sessions language plpgsql security definer set search_path='' as $$
declare u uuid:=(select auth.uid());s public.study_sessions;requested_groups uuid[]:=coalesce(p_group_ids,'{}'::uuid[]);
begin
 if u is null then raise exception using errcode='42501',message='Authentication required';end if;
 if p_notes is not null and char_length(p_notes)>5000 then raise exception using errcode='22001',message='Notes must be 5000 characters or fewer';end if;
 if p_rating is not null and p_rating not between 1 and 5 then raise exception using errcode='22023',message='Rating must be between 1 and 5';end if;
 if p_activity_audience not in('only_me','circles','everyone')then raise exception using errcode='22023',message='Choose a valid activity audience';end if;
 if p_activity_audience='circles'and cardinality(requested_groups)=0 then raise exception using errcode='22023',message='Choose at least one Circle';end if;
 if p_activity_audience<>'circles'and cardinality(requested_groups)>0 then raise exception using errcode='22023',message='Circle selections require the Circles audience';end if;
 if exists(select 1 from unnest(requested_groups)requested(group_id)where not exists(select 1 from public.group_members gm where gm.group_id=requested.group_id and gm.user_id=u))then raise exception using errcode='42501',message='You can only share to Circles you belong to';end if;
 if p_reflection_photo_path is not null and(split_part(p_reflection_photo_path,'/',1)<>u::text or split_part(p_reflection_photo_path,'/',2)<>p_session_id::text)then raise exception using errcode='42501',message='Reflection photo path is not owned by this session';end if;
 update public.study_sessions set notes=nullif(btrim(p_notes),''),rating=p_rating,
  share_notes=(p_activity_audience<>'only_me')or(coalesce(p_share_notes,false)and false),
  reflection_photo_path=p_reflection_photo_path,activity_audience=p_activity_audience
 where id=p_session_id and user_id=u and ended_at is not null returning*into s;
 if not found then raise exception using errcode='P0002',message='Completed study session not found';end if;
 delete from public.session_audience_groups where session_id=p_session_id;
 if p_activity_audience='circles'then insert into public.session_audience_groups(session_id,group_id)select p_session_id,group_id from unnest(requested_groups)group_id on conflict do nothing;end if;
 return s;
end;
$$;
