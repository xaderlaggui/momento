-- Forward fix: 0001_init.sql used v_count without declaring it, so every new
-- guest join failed with SQLSTATE 42703. 0001 is now corrected for fresh
-- installs; this migration redefines the function on databases that already
-- applied 0001. Run in the Supabase SQL editor (or supabase db push).
--
-- `create or replace` is idempotent and only redefines the function body — no
-- schema change, no data migration.

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
