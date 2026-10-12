-- Momento — feature migration: room edit / rename, invite revoke (code rotate),
-- and account deletion.
--
-- Also defines public.is_room_owner(), which 0001_init.sql referenced from
-- set_room_max() but never created — so set_room_max() failed at runtime on
-- fresh installs. This migration fixes that too.

-- Missing helper referenced by 0001 (set_room_max) and used below.
create or replace function public.is_room_owner(p_room_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.rooms where id = p_room_id and owner_id = auth.uid()
  )
$$;

-- Rename a room and/or change its event date. Owner only.
create or replace function public.rename_room(
  p_room_id uuid,
  p_name text,
  p_event_date date default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_room_owner(p_room_id) then
    raise exception 'NOT_OWNER' using errcode = '40300';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 60 then
    raise exception 'INVALID_NAME' using errcode = '22001';
  end if;
  update public.rooms
    set name = btrim(p_name), event_date = p_event_date
    where id = p_room_id;
end
$$;

-- Revoke the current invite by issuing a fresh code. Existing guests keep
-- access — their membership is keyed by auth uid, not the code. Owner only.
create or replace function public.rotate_room_code(p_room_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alphabet text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  v_code text;
  v_attempt int;
  v_i int;
begin
  if not public.is_room_owner(p_room_id) then
    raise exception 'NOT_OWNER' using errcode = '40300';
  end if;
  for v_attempt in 1..8 loop
    v_code := '';
    for v_i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    begin
      update public.rooms set code = v_code where id = p_room_id;
      return v_code;
    exception
      when unique_violation then
        -- collision: try another code
    end;
  end loop;
  raise exception 'CODE_GEN_FAILED' using errcode = '50000';
end
$$;

-- Delete the caller's own account. Cascades to their rooms, members, and
-- photos (see the on-delete-cascade FKs in 0001). Storage objects under the
-- photos bucket are NOT cascaded and are left orphaned; a scheduled cleanup
-- (or Supabase storage lifecycle) should sweep them.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  delete from auth.users where id = v_uid;
end
$$;

revoke all on function public.is_room_owner (uuid) from public;
revoke all on function public.rename_room (uuid, text, date) from public;
revoke all on function public.rotate_room_code (uuid) from public;
revoke all on function public.delete_my_account () from public;

grant execute on function public.is_room_owner (uuid) to authenticated;
grant execute on function public.rename_room (uuid, text, date) to authenticated;
grant execute on function public.rotate_room_code (uuid) to authenticated;
grant execute on function public.delete_my_account () to authenticated;
