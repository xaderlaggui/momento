-- Momento — initial schema. Run in Supabase SQL editor (or supabase db push).
-- Roles: owner = magic-link auth user; guest = anonymous sign-in user.

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  event_date date,
  status text not null default 'open' check (status in ('open', 'closed')),
  max_members int not null default 10 check (max_members between 1 and 10),
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  token text not null default encode(gen_random_bytes(32), 'hex'),
  joined_at timestamptz not null default now(),
  unique (room_id, auth_user_id)
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  storage_path text not null,
  status text not null default 'pending' check (status in ('pending', 'kept')),
  created_at timestamptz not null default now()
);

create index if not exists photos_room_status_idx on public.photos (room_id, status);
create index if not exists photos_member_status_idx on public.photos (member_id, status);

alter table public.rooms enable row level security;
alter table public.members enable row level security;
alter table public.photos enable row level security;

-- Owner reads own rooms.
create policy "rooms owner read" on public.rooms
  for select using (owner_id = auth.uid ());

create policy "rooms owner insert" on public.rooms
  for insert with check (owner_id = auth.uid ());

-- Guests read their own membership; owners read members of their rooms.
create policy "members self read" on public.members
  for select using (auth_user_id = auth.uid ());

create policy "members owner read" on public.members
  for select using (
    exists (select 1 from public.rooms r where r.id = members.room_id and r.owner_id = auth.uid ())
  );

-- Members of a room can read the room row (needed by storage policies + UI).
create policy "rooms member read" on public.rooms
  for select using (
    exists (select 1 from public.members m where m.room_id = rooms.id and m.auth_user_id = auth.uid ())
  );

-- Guests read own photos; owners read all room photos.
create policy "photos own read" on public.photos
  for select using (
    exists (select 1 from public.members m where m.id = photos.member_id and m.auth_user_id = auth.uid ())
  );

create policy "photos owner read" on public.photos
  for select using (
    exists (select 1 from public.rooms r where r.id = photos.room_id and r.owner_id = auth.uid ())
  );

-- All writes go through security-definer RPCs below. No insert/update/delete policies.

create or replace function public.room_id_for_code(p_code text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from public.rooms where code = upper(p_code)
$$;

create or replace function public.set_room_max(p_room_id uuid, p_max int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if p_max is null or p_max < 1 or p_max > 10 then
    raise exception 'MAX_RANGE' using errcode = '22001';
  end if;
  if not public.is_room_owner(p_room_id) then
    raise exception 'NOT_OWNER' using errcode = '40300';
  end if;
  update public.rooms set max_members = p_max where id = p_room_id;
end
$$;

create or replace function public.join_room(p_code text, p_display_name text, p_token text default null)
returns public.members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.rooms;
  v_member public.members;
  v_count integer;
  v_uid uuid := auth.uid ();
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  select * into v_room from public.rooms where code = upper(p_code);
  if v_room.id is null then
    raise exception 'ROOM_NOT_FOUND' using errcode = '40400';
  end if;
  select * into v_member from public.members where room_id = v_room.id and auth_user_id = v_uid;
  if v_member.id is not null then
    -- Resume: name not required, only token check.
    if p_token is not null and p_token <> v_member.token then
      raise exception 'TOKEN_MISMATCH' using errcode = '40301';
    end if;
    return v_member;
  end if;
  if v_room.status = 'closed' then
    raise exception 'ROOM_CLOSED' using errcode = '40300';
  end if;
  if p_display_name is null
     or char_length(btrim(p_display_name)) = 0
     or char_length(btrim(p_display_name)) > 40 then
    raise exception 'INVALID_NAME' using errcode = '22001';
  end if;
  -- Enforce member cap (only blocks new joins; resumes pass above).
  select count(*) into v_count from public.members where room_id = v_room.id;
  if v_count >= v_room.max_members then
    raise exception 'ROOM_FULL' using errcode = '40900';
  end if;
  insert into public.members (room_id, auth_user_id, display_name)
    values (v_room.id, v_uid, btrim(p_display_name))
    returning * into v_member;
  return v_member;
end
$$;

create or replace function public.photo_submit(p_room_code text, p_storage_path text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid ();
  v_room public.rooms;
  v_member public.members;
  v_kept int;
  v_id uuid;
  v_prefix text;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  select * into v_room from public.rooms where code = upper(p_room_code);
  if v_room.id is null then
    raise exception 'ROOM_NOT_FOUND' using errcode = '40400';
  end if;
  if v_room.status = 'closed' then
    raise exception 'ROOM_CLOSED' using errcode = '40300';
  end if;
  select * into v_member from public.members where room_id = v_room.id and auth_user_id = v_uid;
  if v_member.id is null then
    raise exception 'NOT_A_MEMBER' using errcode = '40300';
  end if;
  v_prefix := v_room.id::text || '/' || v_member.id::text || '/';
  if p_storage_path is null or left(p_storage_path, length(v_prefix)) <> v_prefix then
    raise exception 'BAD_PATH' using errcode = '22001';
  end if;
  select count(*) into v_kept from public.photos where member_id = v_member.id and status = 'kept';
  if v_kept >= 20 then
    raise exception 'CAP_REACHED' using errcode = '40900';
  end if;
  insert into public.photos (room_id, member_id, storage_path)
    values (v_room.id, v_member.id, p_storage_path)
    returning id into v_id;
  return v_id;
end
$$;

create or replace function public.photo_keep(p_photo_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid ();
  v_photo public.photos;
  v_member public.members;
  v_kept int;
begin
  select * into v_photo from public.photos where id = p_photo_id;
  if v_photo.id is null then
    raise exception 'NOT_FOUND' using errcode = '40400';
  end if;
  select * into v_member from public.members where id = v_photo.member_id and auth_user_id = v_uid;
  if v_member.id is null then
    raise exception 'NOT_OWNER' using errcode = '40300';
  end if;
  if v_photo.status <> 'pending' then
    raise exception 'NOT_PENDING' using errcode = '40900';
  end if;
  select count(*) into v_kept from public.photos where member_id = v_member.id and status = 'kept';
  if v_kept >= 20 then
    raise exception 'CAP_REACHED' using errcode = '40900';
  end if;
  update public.photos set status = 'kept' where id = p_photo_id;
end
$$;

create or replace function public.photo_discard(p_photo_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid ();
  v_photo public.photos;
  v_member public.members;
begin
  select * into v_photo from public.photos where id = p_photo_id;
  if v_photo.id is null then
    raise exception 'NOT_FOUND' using errcode = '40400';
  end if;
  select * into v_member from public.members where id = v_photo.member_id and auth_user_id = v_uid;
  if v_member.id is null then
    raise exception 'NOT_OWNER' using errcode = '40300';
  end if;
  if v_photo.status <> 'pending' then
    raise exception 'NOT_PENDING' using errcode = '40900';
  end if;
  delete from public.photos where id = p_photo_id;
end
$$;

create or replace function public.close_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.rooms
    set status = 'closed'
    where id = p_room_id and owner_id = auth.uid ();
  if not found then
    raise exception 'NOT_OWNER_OR_ROOM' using errcode = '40300';
  end if;
end
$$;

revoke all on function public.room_id_for_code (text) from public;
revoke all on function public.join_room (text, text, text) from public;
revoke all on function public.photo_submit (text, text) from public;
revoke all on function public.photo_keep (uuid) from public;
revoke all on function public.photo_discard (uuid) from public;
revoke all on function public.close_room (uuid) from public;

grant execute on function public.room_id_for_code (text) to authenticated, anon;
grant execute on function public.join_room (text, text, text) to authenticated, anon;
grant execute on function public.photo_submit (text, text) to authenticated, anon;
grant execute on function public.photo_keep (uuid) to authenticated, anon;
grant execute on function public.photo_discard (uuid) to authenticated, anon;
grant execute on function public.close_room (uuid) to authenticated;
revoke all on function public.set_room_max (uuid, int) from public;
grant execute on function public.set_room_max (uuid, int) to authenticated;

-- Storage: private bucket, path = {room_id}/{member_id}/{file}.jpg
insert into storage.buckets (id, name, public)
  values ('photos', 'photos', false)
  on conflict (id) do nothing;

create policy "guest uploads own folder" on storage.objects
  for insert to authenticated, anon
  with check (
    bucket_id = 'photos'
    and exists (
      select 1 from public.rooms r
      join public.members m on m.room_id = r.id
      where r.id::text = (storage.foldername(name))[1]
        and m.id::text = (storage.foldername(name))[2]
        and m.auth_user_id = auth.uid ()
        and r.status = 'open'
    )
  );

create policy "member reads own folder" on storage.objects
  for select to authenticated, anon
  using (
    bucket_id = 'photos'
    and exists (
      select 1 from public.rooms r
      join public.members m on m.room_id = r.id
      where r.id::text = (storage.foldername(name))[1]
        and m.id::text = (storage.foldername(name))[2]
        and m.auth_user_id = auth.uid ()
    )
  );

create policy "member deletes own uploads" on storage.objects
  for delete to authenticated, anon
  using (
    bucket_id = 'photos'
    and exists (
      select 1 from public.rooms r
      join public.members m on m.room_id = r.id
      where r.id::text = (storage.foldername(name))[1]
        and m.id::text = (storage.foldername(name))[2]
        and m.auth_user_id = auth.uid ()
    )
  );

create policy "owner reads room folder" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and exists (
      select 1 from public.rooms r
      where r.id::text = (storage.foldername(name))[1]
        and r.owner_id = auth.uid ()
    )
  );

-- Realtime for owner grid.
do $$
begin
  alter publication supabase_realtime add table public.photos;
exception
  when duplicate_object then null;
end
$$;
