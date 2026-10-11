export type RoomStatus = "open" | "closed";
export type PhotoStatus = "pending" | "kept";

export interface Room {
  id: string;
  code: string;
  owner_id: string;
  name: string;
  event_date: string | null;
  status: RoomStatus;
  max_members: number;
  created_at: string;
}

export interface Member {
  id: string;
  room_id: string;
  auth_user_id: string;
  display_name: string;
  token: string;
  joined_at: string;
}

export interface Photo {
  id: string;
  room_id: string;
  member_id: string;
  storage_path: string;
  status: PhotoStatus;
  created_at: string;
}
