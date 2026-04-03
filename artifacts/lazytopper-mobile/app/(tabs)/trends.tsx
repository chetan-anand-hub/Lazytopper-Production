import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SubjectToggle } from "@/components/SubjectToggle";
import { TopicCard } from "@/components/TopicCard";
import { useColors } from "@/hooks/useColors";
import { mathTopicTrends, scienceTopicTrends } from "@workspace/shared-data";
import type { LTSubjectKey, TopicTier } from "@workspace/shared-data";

const TIER_FILTERS: { label: string; value: TopicTier | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Must Crack", value: "must-crack" },
  { label: "High ROI", value: "high-roi" },
  { label: "Good to Do", value: "good-to-do" },
];

export default function TrendsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [subject, setSubject] = useState<LTSubjectKey>("Maths");
  const [tierFilter, setTierFilter] = useState<TopicTier | "all">("all");
  const topPad = Platform.OS === "web" ? 67 : 0;

  const filteredTopics = useMemo(() => {
    if (subject === "Maths") {
      const list = tierFilter === "all" ? mathTopicTrends : mathTopicTrends.filter((t) => t.tier === tierFilter);
      return list.map((t) => ({
        key: t.topicKey,
        name: t.topicKey,
        weightage: t.weightagePercent,
        tier: t.tier,
        summary: t.summary,
        concepts: Object.keys(t.conceptWeightage),
      }));
    }
    const list = tierFilter === "all" ? scienceTopicTrends : scienceTopicTrends.filter((t) => t.tier === tierFilter);
    return list.map((t) => ({
      key: t.topicKey,
      name: t.topicName,
      weightage: t.weightagePercent,
      tier: t.tier,
      summary: t.concepts.map((c) => c.summary_and_exam_tips).join(" "),
      concepts: t.concepts.map((c) => c.name),
    }));
  }, [subject, tierFilter]);

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.heading, { color: colors.foreground }]}>Topic Trends</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Based on 10 years of CBSE board papers
      </Text>

      <SubjectToggle selected={subject} onChange={setSubject} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {TIER_FILTERS.map((f) => {
          const active = tierFilter === f.value;
          return (
            <Pressable
              key={f.value}
              onPress={() => setTierFilter(f.value)}
              style={[
                styles.filterPill,
                {
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: active ? colors.primaryForeground : colors.foreground },
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={[styles.countText, { color: colors.mutedForeground }]}>
        {filteredTopics.length} topic{filteredTopics.length !== 1 ? "s" : ""}
      </Text>

      {filteredTopics.map((t) => (
        <TopicCard
          key={t.key}
          topicName={t.name}
          weightagePercent={t.weightage}
          tier={t.tier}
          summary={t.summary}
          concepts={t.concepts}
        />
      ))}

      <View style={{ height: insets.bottom + 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16 },
  heading: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    marginBottom: 16,
  },
  filterScroll: {
    marginTop: 14,
    marginBottom: 6,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  countText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginBottom: 12,
    marginTop: 8,
  },
});
