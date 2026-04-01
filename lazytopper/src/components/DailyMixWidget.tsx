import { useMemo } from "react";
import DailyMixPlayer from "./DailyMixPlayer";
import type { DailyMixItem } from "../services/dailyMixPlayback";
import { generateDailyMix } from "../services/dailyMixService";

export interface DailyMixWidgetProps {
  grade: number;
  subject: "Maths" | "Science";
  topic: string;
  count?: number;
  intensity?: "light" | "normal" | "hard";
  seedKey: string;
  className?: string;
  /**
   * Optional override: if you already have a playlist (cached or server-provided),
   * pass it here and we won't regenerate.
   */
  itemsOverride?: DailyMixItem[];
}

export default function DailyMixWidget(props: DailyMixWidgetProps) {
  const items = useMemo(() => {
    if (props.itemsOverride?.length) return props.itemsOverride;

    // Uses your existing generator/service so logic stays centralized.
    // If generateDailyMix changes its signature later, update here only.
    return generateDailyMix({
      grade: props.grade,
      subject: props.subject,
      topic: props.topic,
      seedKey: props.seedKey,
      count: props.count ?? 8,
      intensity: props.intensity ?? "normal",
    }) as DailyMixItem[];
  }, [
    props.count,
    props.grade,
    props.itemsOverride,
    props.intensity,
    props.seedKey,
    props.subject,
    props.topic,
  ]);

  return (
    <div className={props.className}>
      <DailyMixPlayer items={items} />
    </div>
  );
}
