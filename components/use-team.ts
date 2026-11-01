"use client";

// Loads the team list. "Me" is the team lead (team_members.role = 'lead'); there is no login.
// reload() fetches the list again, e.g. after someone is added.
import { useCallback, useEffect, useState } from "react";
import type { TeamMember } from "@/lib/contracts/domain";
import { browserSupabase } from "@/lib/supabase/browser";
import { errorText } from "@/components/api";

export function useTeam() {
  const [team, setTeam] = useState<TeamMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { data, error } = await browserSupabase().from("team_members").select("*").order("name");
        if (error) throw new Error(error.message);
        if (live) {
          setTeam((data ?? []) as TeamMember[]);
          setError(null);
        }
      } catch (e) {
        if (live) setError(errorText(e));
      }
    })();
    return () => {
      live = false;
    };
  }, [version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return { team, error, lead: team?.find((m) => m.role === "lead") ?? null, reload };
}
