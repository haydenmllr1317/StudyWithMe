-- Social identity is projected only through reviewed aggregate/group RPCs.
-- Full profile rows include private settings such as timezone and must remain
-- readable only by their owner.
drop policy if exists "Authenticated users can read profiles" on public.profiles;
drop policy if exists "Users can read their own profile" on public.profiles;

create policy "Users can read their own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

comment on policy "Users can read their own profile" on public.profiles is
  'Full profile rows are private. Social RPCs expose only approved display fields.';
