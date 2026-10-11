import { supabase, BUCKET } from "./supabase";
import type { Member } from "./types";

interface GuestSession {
  roomCode: string;
  memberId: string;
  token: string;
}

const KEY = "momento.guest";

export function loadGuestSession(roomCode: string): GuestSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as GuestSession) : null;
    if (v && v.roomCode === roomCode.toUpperCase() && v.memberId) return v;
  } catch {
    /* corrupt entry → ignore */
  }
  return null;
}

export function saveGuestSession(s: GuestSession): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearGuestSession(): void {
  localStorage.removeItem(KEY);
}

async function ensureAnonAuth(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw new Error("Anonymous sign-in failed. Is it enabled in Supabase?");
  }
}

function mapJoinError(message: string): string {
  if (message.includes("ROOM_CLOSED")) return "This camera is closed. No more shots today.";
  if (message.includes("ROOM_NOT_FOUND")) return "This camera does not exist.";
  if (message.includes("INVALID_NAME")) return "Pick a name between 1 and 40 characters.";
  if (message.includes("TOKEN_MISMATCH")) return "Session mismatch. Reload and join again.";
  return message || "Could not join the room";
}

export async function joinRoom(roomCode: string, displayName: string): Promise<Member> {
  await ensureAnonAuth();
  const code = roomCode.toUpperCase();
  const existing = loadGuestSession(code);
  const { data, error } = await supabase.rpc("join_room", {
    p_code: code,
    p_display_name: displayName.trim(),
    p_token: existing?.token ?? null,
  });
  if (error) throw new Error(mapJoinError(error.message ?? ""));
  const member = data as Member;
  saveGuestSession({ roomCode: code, memberId: member.id, token: member.token });
  return member;
}

export async function resumeMember(roomCode: string): Promise<Member> {
  await ensureAnonAuth();
  const session = loadGuestSession(roomCode);
  if (!session) throw new Error("No session");
  const { data, error } = await supabase.rpc("join_room", {
    p_code: session.roomCode,
    p_display_name: null,
    p_token: session.token,
  });
  if (error) throw new Error(mapJoinError(error.message ?? ""));
  return data as Member;
}

export async function getRoomId(roomCode: string): Promise<string> {
  const { data, error } = await supabase.rpc("room_id_for_code", { p_code: roomCode.toUpperCase() });
  if (error || !data) throw new Error("This camera does not exist.");
  return data as string;
}

export async function countKept(memberId: string): Promise<number> {
  const { count } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("member_id", memberId)
    .eq("status", "kept");
  return count ?? 0;
}

async function uploadShot(roomId: string, memberId: string, blob: Blob): Promise<string> {
  const path = `${roomId}/${memberId}/${Date.now()}-${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return path;
}

/** Uploads the blob, inserts a pending row. Returns photo id + storage path. */
export async function submitPending(
  roomCode: string,
  roomId: string,
  memberId: string,
  blob: Blob
): Promise<{ id: string; storagePath: string }> {
  const storagePath = await uploadShot(roomId, memberId, blob);
  const { data, error } = await supabase.rpc("photo_submit", {
    p_room_code: roomCode.toUpperCase(),
    p_storage_path: storagePath,
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw new Error(error.message ?? "Upload rejected");
  }
  return { id: data as string, storagePath };
}

export async function keepPhoto(photoId: string): Promise<void> {
  const { error } = await supabase.rpc("photo_keep", { p_photo_id: photoId });
  if (error) {
    throw new Error(error.message?.includes("CAP_REACHED") ? "Roll is full — 20 shots." : error.message);
  }
}

export async function discardPhoto(photoId: string, storagePath: string): Promise<void> {
  const { error } = await supabase.rpc("photo_discard", { p_photo_id: photoId });
  if (error) throw error;
  await supabase.storage.from(BUCKET).remove([storagePath]);
}
