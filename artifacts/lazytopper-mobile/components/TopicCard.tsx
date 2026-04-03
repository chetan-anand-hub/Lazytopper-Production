import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { TierBadge } from "./TierBadge";
import type { TopicTier } from "@/data/types";

interface Props {
  topicName: string;
  weightagePercent: number;
  tier: TopicTier;
  summary: string;
  concepts: string[];
  onPress?: () => void;
}

export function TopicCard({ topicName, weightagePercent, tier, summary, concepts, onPress }: Props) {
  const colors = useColors();

  const barColor =
    tier === "must-crack" ? colors.tierMustCrack
      : tier === "high-roi" ? colors.tierHighRoi
        : colors.tierGoodToDo;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.topicName, { color: colors.foreground }]}>{topicName}</Text>
          <View style={styles.weightageChip}>
            <Text style={[styles.weightageText, { color: barColor }]}>
              {weightagePercent}%
            </Text>
          </View>
        </View>
        <TierBadge tier={tier} compact />
      </View>

      <View style={styles.barContainer}>
        <View style={[styles.barBg, { backgroundColor: colors.muted }]}>
          <View
            style={[styles.barFill, { backgroundColor: barColor, width: `${Math.min(weightagePercent * 5, 100)}%` }]}
          />
        </View>
      </View>

      <Text style={[styles.summary, { color: colors.mutedForeground }]} numberOfLines={2}>
        {summary}
      </Text>

      {concepts.length > 0 && (
        <View style={styles.conceptsRow}>
          {concepts.slice(0, 3).map((c) => (
            <View key={c} style={[styles.conceptChip, { backgroundColor: colors.muted }]}>
              <Text style={[styles.conceptText, { color: colors.foreground }]} numberOfLines={1}>
                {c}
              </Text>
            </View>
          ))}
          {concepts.length > 3 && (
            <Text style={[styles.moreText, { color: colors.mutedForeground }]}>
              +{concepts.length - 3}
            </Text>
          )}
        </View>
      )}

      <View style={styles.footer}>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  topicName: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  weightageChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  weightageText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  barContainer: {
    marginBottom: 10,
  },
  barBg: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  summary: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  conceptsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  conceptChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  conceptText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  moreText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  footer: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },
});
