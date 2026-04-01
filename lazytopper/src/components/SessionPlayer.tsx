import { useMemo } from "react";
import DailyMixPlayer from "./DailyMixPlayer";
import type { DailyMixItem } from "../services/dailyMixPlayback";
import type { SessionItem } from "../services/sessionTypes";

export interface SessionPlayerProps {
  items?: SessionItem[];
  grade?: string;
  subject?: string;
  onExit?: () => void | Promise<void>;
  autoAdvanceMs?: number;
  className?: string;
}

function toDailyMixType(itemType: SessionItem["itemType"]): DailyMixItem["type"] {
  if (itemType === "practice_question" || itemType === "mastery_quiz") return "question";
  if (itemType === "revision_card" || itemType === "exam_tip_card") return "card";
  return "revision";
}

export default function SessionPlayer(props: SessionPlayerProps) {
  const mappedItems = useMemo<DailyMixItem[]>(
    () =>
      (props.items || []).map((item, idx) => ({
        id: item.id || `session-item-${idx + 1}`,
        type: toDailyMixType(item.itemType),
        title: item.title,
        description: item.description,
        payload: {
          refId: item.refId,
          itemType: item.itemType,
          payload: item.payload,
        },
      })),
    [props.items]
  );

  return (
    <DailyMixPlayer
      items={mappedItems}
      grade={props.grade}
      subject={props.subject}
      onExit={props.onExit}
      autoAdvanceMs={props.autoAdvanceMs}
      className={props.className}
    />
  );
}
