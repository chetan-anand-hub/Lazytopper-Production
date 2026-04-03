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
import { Feather } from "@expo/vector-icons";

import { SubjectToggle } from "@/components/SubjectToggle";
import { TopicCard } from "@/components/TopicCard";
import { useColors } from "@/hooks/useColors";
import { mathTopicTrends, scienceTopicTrends } from "@workspace/shared-data";
import type { LTSubjectKey, TopicTier } from "@workspace/shared-data";

type ScienceStream = "all" | "Physics" | "Chemistry" | "Biology";

const TIER_FILTERS: { label: string; value: TopicTier | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Must Crack", value: "must-crack" },
  { label: "High ROI", value: "high-roi" },
  { label: "Good to Do", value: "good-to-do" },
];

const SCIENCE_STREAMS: { label: string; value: ScienceStream; icon: "layers" | "droplet" | "heart" | "zap" }[] = [
  { label: "All", value: "all", icon: "layers" },
  { label: "Physics", value: "Physics", icon: "zap" },
  { label: "Chemistry", value: "Chemistry", icon: "droplet" },
  { label: "Biology", value: "Biology", icon: "heart" },
];

const STREAM_MAP: Record<string, ScienceStream> = {
  Light: "Physics",
  Electricity: "Physics",
  MagneticEffects: "Physics",
  HumanEyeAndColourfulWorld: "Physics",
  ChemicalReactions: "Chemistry",
  AcidsBasesSalts: "Chemistry",
  MetalsNonMetals: "Chemistry",
  CarbonCompounds: "Chemistry",
};

function classifyScienceStream(topicKey: string): ScienceStream {
  return STREAM_MAP[topicKey] ?? "Biology";
}

export default function TrendsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [subject, setSubject] = useState<LTSubjectKey>("Maths");
  const [tierFilter, setTierFilter] = useState<TopicTier | "all">("all");
  const [scienceStream, setScienceStream] = useState<ScienceStream>("all");
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
        stream: undefined as ScienceStream | undefined,
      }));
    }

    let list = tierFilter === "all" ? scienceTopicTrends : scienceTopicTrends.filter((t) => t.tier === tierFilter);
    if (scienceStream !== "all") {
      list = list.filter((t) => classifyScienceStream(t.topicKey) === scienceStream);
    }

    return list.map((t) => ({
      key: t.topicKey,
      name: t.topicName,
      weightage: t.weightagePercent,
      tier: t.tier,
      summary: t.concepts.map((c) => c.summary_and_exam_tips).join(" "),
      concepts: t.concepts.map((c) => c.name),
      stream: classifyScienceStream(t.topicKey),
    }));
  }, [subject, tierFilter, scienceStream]);

  const difficultyMix = useMemo(() => {
    if (subject === "Maths") {
      return { easy: 25, medium: 45, hard: 30 };
    }
    if (scienceStream === "Physics") return { easy: 20, medium: 45, hard: 35 };
    if (scienceStream === "Chemistry") return { easy: 30, medium: 45, hard: 25 };
    if (scienceStream === "Biology") return { easy: 35, medium: 40, hard: 25 };
    return { easy: 28, medium: 43, hard: 29 };
  }, [subject, scienceStream]);

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

      <SubjectToggle selected={subject} onChange={(s) => { setSubject(s); setScienceStream("all"); }} />

      {subject === "Science" && (
        <View style={styles.streamRow}>
          {SCIENCE_STREAMS.map((s) => {
            const active = scienceStream === s.value;
            return (
              <Pressable
                key={s.value}
                onPress={() => setScienceStream(s.value)}
                style={[
                  styles.streamPill,
                  {
                    backgroundColor: active ? colors.secondary + "15" : colors.card,
                    borderColor: active ? colors.secondary : colors.border,
                  },
                ]}
              >
                <Feather
                  name={s.icon}
                  size={13}
                  color={active ? colors.secondary : colors.mutedForeground}
                />
                <Text style={[styles.streamText, { color: active ? colors.secondary : colors.foreground }]}>
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

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

      <View style={[styles.diffMixCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.diffMixTitle, { color: colors.foreground }]}>Difficulty Mix</Text>
        <View style={styles.diffBarRow}>
          <View style={[styles.diffBar, { flex: difficultyMix.easy, backgroundColor: "#58cc02" }]} />
          <View style={[styles.diffBar, { flex: difficultyMix.medium, backgroundColor: "#ff9600" }]} />
          <View style={[styles.diffBar, { flex: difficultyMix.hard, backgroundColor: "#ff4b4b" }]} />
        </View>
        <View style={styles.diffLabels}>
          <View style={styles.diffLabelItem}>
            <View style={[styles.diffDot, { backgroundColor: "#58cc02" }]} />
            <Text style={[styles.diffLabelText, { color: colors.mutedForeground }]}>Easy {difficultyMix.easy}%</Text>
          </View>
          <View style={styles.diffLabelItem}>
            <View style={[styles.diffDot, { backgroundColor: "#ff9600" }]} />
            <Text style={[styles.diffLabelText, { color: colors.mutedForeground }]}>Medium {difficultyMix.medium}%</Text>
          </View>
          <View style={styles.diffLabelItem}>
            <View style={[styles.diffDot, { backgroundColor: "#ff4b4b" }]} />
            <Text style={[styles.diffLabelText, { color: colors.mutedForeground }]}>Hard {difficultyMix.hard}%</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.countText, { color: colors.mutedForeground }]}>
        {filteredTopics.length} topic{filteredTopics.length !== 1 ? "s" : ""}
        {subject === "Science" && scienceStream !== "all" ? ` in ${scienceStream}` : ""}
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
  streamRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },
  streamPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  streamText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
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
  diffMixCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  diffMixTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    marginBottom: 8,
  },
  diffBarRow: {
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    gap: 2,
    marginBottom: 8,
  },
  diffBar: {
    borderRadius: 4,
    height: 8,
  },
  diffLabels: {
    flexDirection: "row",
    gap: 14,
  },
  diffLabelItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  diffDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  diffLabelText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  countText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginBottom: 12,
    marginTop: 8,
  },
});
