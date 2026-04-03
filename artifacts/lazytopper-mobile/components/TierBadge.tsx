import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { TopicTier } from "@workspace/shared-data";

const TIER_LABELS: Record<TopicTier, string> = {
  "must-crack": "Must Crack",
  "high-roi": "High ROI",
  "good-to-do": "Good to Do",
};

interface Props {
  tier: TopicTier;
  compact?: boolean;
}

export function TierBadge({ tier, compact }: Props) {
  const colors = useColors();
  const tierColor =
    tier === "must-crack"
      ? colors.tierMustCrack
      : tier === "high-roi"
        ? colors.tierHighRoi
        : colors.tierGoodToDo;

  return (
    <View style={[styles.badge, { backgroundColor: tierColor + "20", borderColor: tierColor }]}>
      <Text style={[styles.text, { color: tierColor, fontSize: compact ? 10 : 11 }]}>
        {TIER_LABELS[tier]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  text: {
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
