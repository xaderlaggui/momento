import type { Member } from "@/lib/types";
import { SHOTS_PER_ROLL } from "@/lib/supabase";

interface Props {
  members: Member[];
  keptCounts: Record<string, number>;
}

export function RoomMembers({ members, keptCounts }: Props) {
  return (
    <ul className="divide-y divide-line">
      {members.map((m) => {
        const kept = keptCounts[m.id] ?? 0;
        const pct = Math.round((kept / SHOTS_PER_ROLL) * 100);
        return (
          <li key={m.id} className="py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-semibold">{m.display_name}</span>
              <span className="label shrink-0">
                {kept}/{SHOTS_PER_ROLL}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className={`h-full rounded-full ${kept >= SHOTS_PER_ROLL ? "bg-red" : "bg-accent"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
      {members.length === 0 && <li className="py-2 text-muted">No one joined yet.</li>}
    </ul>
  );
}
