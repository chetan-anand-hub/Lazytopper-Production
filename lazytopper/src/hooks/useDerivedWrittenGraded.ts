// src/hooks/useDerivedWrittenGraded.ts
//
// RESULT-LIST-BACKFILL-1 - the DISPLAY copy of a Chapter Test / Full Mock record list, with `writtenGraded`
// derived at read time for records written before #1802 (see services/legacyWrittenGraded.ts). The input
// list is returned at once; the derived copy replaces it when the (memoised) payload reads settle. Use it
// ONLY for what a list SHOWS - never feed its output to a write.

import { useEffect, useState } from "react";
import type { SessionRecord } from "../services/sessionRecords";
import {
  deriveWrittenGraded,
  isLegacyWrittenGradedCandidate,
  isLegacyWrittenGradedEnabled,
} from "../services/legacyWrittenGraded";

export function useDerivedWrittenGraded(records: SessionRecord[], uid: string | null | undefined): SessionRecord[] {
  const [derived, setDerived] = useState<{ source: SessionRecord[]; out: SessionRecord[] } | null>(null);
  useEffect(() => {
    if (!uid || !isLegacyWrittenGradedEnabled() || !records.some(isLegacyWrittenGradedCandidate)) return undefined;
    let live = true;
    void deriveWrittenGraded(uid, records).then((out) => {
      if (live) setDerived({ source: records, out });
    });
    return () => {
      live = false;
    };
  }, [records, uid]);
  return derived && derived.source === records ? derived.out : records;
}
