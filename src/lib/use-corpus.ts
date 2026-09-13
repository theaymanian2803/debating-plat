import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { seedData } from "@/lib/admin-store";
import { getCorpus } from "@/lib/corpus-api";
import { adminToEntries, collectionsFor } from "@/lib/corpus-adapter";
import type { Entry } from "@/lib/corpus";

export function useCorpus(): {
  entries: Entry[];
  collections: { id: string; label: string }[];
} {
  const { data } = useQuery({
    queryKey: ["corpus"],
    queryFn: getCorpus,
    placeholderData: seedData,
  });

  return useMemo(() => {
    const entries = adminToEntries(data ?? seedData());
    return { entries, collections: collectionsFor(entries) };
  }, [data]);
}
