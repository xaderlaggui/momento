import JSZip from "jszip";
import { supabase, BUCKET } from "./supabase";
import type { Member, Photo, Room } from "./types";

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function randomRoomCode(len = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export function inviteLink(code: string): string {
  return `${window.location.origin}/r/${code}`;
}

export async function createRoom(
  name: string,
  eventDate: string | null,
  maxMembers = 10
): Promise<Room> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not signed in");
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomRoomCode();
    const { data, error } = await supabase
      .from("rooms")
      .insert({ code, owner_id: userData.user.id, name, event_date: eventDate, max_members: maxMembers })
      .select()
      .single();
    if (data && !error) return data as Room;
    if (error && error.code !== "23505") throw error;
  }
  throw new Error("Could not generate a room code");
}

export async function listRooms(): Promise<Room[]> {
  const { data } = await supabase.from("rooms").select("*").order("created_at", { ascending: false });
  return (data ?? []) as Room[];
}

export async function getRoom(id: string): Promise<Room> {
  const { data, error } = await supabase.from("rooms").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Room;
}

export async function closeRoom(id: string): Promise<void> {
  const { error } = await supabase.rpc("close_room", { p_room_id: id });
  if (error) throw error;
}

export async function setRoomMax(id: string, max: number): Promise<void> {
  const { error } = await supabase.rpc("set_room_max", { p_room_id: id, p_max: max });
  if (error) throw error;
}

export async function listMembers(roomId: string): Promise<Member[]> {
  const { data } = await supabase
    .from("members")
    .select("*")
    .eq("room_id", roomId)
    .order("joined_at");
  return (data ?? []) as Member[];
}

export async function listRoomPhotos(roomId: string): Promise<Photo[]> {
  const { data } = await supabase
    .from("photos")
    .select("*")
    .eq("room_id", roomId)
    .eq("status", "kept")
    .order("created_at");
  return (data ?? []) as Photo[];
}

export async function signedUrl(path: string): Promise<string> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? "";
}

function safeName(s: string): string {
  return s.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 40) || "guest";
}

export function triggerDownload(href: string, filename: string): void {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function downloadRoomZip(
  roomId: string,
  roomName: string,
  onProgress?: (pct: number) => void
): Promise<void> {
  const [photos, members] = await Promise.all([listRoomPhotos(roomId), listMembers(roomId)]);
  if (photos.length === 0) throw new Error("No photos in this room yet.");
  const memberNames = new Map(members.map((m) => [m.id, safeName(m.display_name)]));
  const counters = new Map<string, number>();
  const zip = new JSZip();
  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    const { data, error } = await supabase.storage.from(BUCKET).download(p.storage_path);
    if (error) throw error;
    const n = (counters.get(p.member_id) ?? 0) + 1;
    counters.set(p.member_id, n);
    zip.file(`${memberNames.get(p.member_id) ?? "guest"}/${String(n).padStart(3, "0")}.jpg`, data);
    onProgress?.(Math.round(((i + 1) / photos.length) * 100));
  }
  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(URL.createObjectURL(blob), `${safeName(roomName)}-momento.zip`);
}
