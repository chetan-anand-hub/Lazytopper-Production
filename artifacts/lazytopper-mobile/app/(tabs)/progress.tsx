import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SubjectToggle } from "@/components/SubjectToggle";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { mathTopicTrends, scienceTopicTrends } from "@workspace/shared-data";
import type { LTSubjectKey } from "@workspace/shared-data";

function ProgressRing({ percent, color, size = 56 }: { percent: number; color: string; size?: number }) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference * (1 - percent / 100);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: color + "20",
          position: "absolute",
        }}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: color,
          borderTopColor: percent < 100 ? "transparent" : color,
          borderRightColor: percent < 50 ? "transparent" : color,
          borderBottomColor: percent < 75 ? "transparent" : color,
          position: "absolute",
          transform: [{ rotate: "-90deg" }],
        }}
      />
      <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color }}>{percent}%</Text>
    </View>
  );
}

export default function ProgressScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [subject, setSubject] = useState<LTSubjectKey>("Maths");
  const topPad = Platform.OS === "web" ? 67 : 0;

  const topics = subject === "Maths"
    ? mathTopicTrends.map((t) => ({ name: t.topicKey, tier: t.tier }))
    : scienceTopicTrends.map((t) => ({ name: t.topicName, tier: t.tier }));

  if (!user) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background, paddingTop: topPad + insets.top }]}>
        <Feather name="bar-chart-2" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Track Your Progress</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Sign in to see your mastery levels and study streaks
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.heading, { color: colors.foreground }]}>Progress</Text>

      <SubjectToggle selected={subject} onChange={setSubject} />

      <View style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ProgressRing percent={0} color={colors.primary} size={72} />
        <View style={styles.overviewText}>
          <Text style={[styles.overviewTitle, { color: colors.foreground }]}>Overall Mastery</Text>
          <Text style={[styles.overviewSub, { color: colors.mutedForeground }]}>
            Start practising to build your mastery
          </Text>
        </View>
      </View>

      <View style={styles.streakRow}>
        <View style={[styles.streakCard, { backgroundColor: colors.orange + "15", borderColor: colors.orange }]}>
          <Feather name="zap" size={20} color={colors.orange} />
          <Text style={[styles.streakValue, { color: colors.foreground }]}>0</Text>
          <Text style={[styles.streakLabel, { color: colors.mutedForeground }]}>Day Streak</Text>
        </View>
        <View style={[styles.streakCard, { backgroundColor: colors.blue + "15", borderColor: colors.blue }]}>
          <Feather name="check-square" size={20} color={colors.blue} />
          <Text style={[styles.streakValue, { color: colors.foreground }]}>0</Text>
          <Text style={[styles.streakLabel, { color: colors.mutedForeground }]}>Questions Done</Text>
        </View>
        <View style={[styles.streakCard, { backgroundColor: colors.green + "15", borderColor: colors.green }]}>
          <Feather name="award" size={20} color={colors.green} />
          <Text style={[styles.streakValue, { color: colors.foreground }]}>0</Text>
          <Text style={[styles.streakLabel, { color: colors.mutedForeground }]}>Tests Taken</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Chapter Progress</Text>

      {topics.map((t) => {
        const tierColor =
          t.tier === "must-crack" ? colors.tierMustCrack
            : t.tier === "high-roi" ? colors.tierHighRoi
              : colors.tierGoodToDo;
        return (
          <View
            key={t.name}
            style={[styles.topicRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.topicDot, { backgroundColor: tierColor }]} />
            <Text style={[styles.topicName, { color: colors.foreground }]} numberOfLines={1}>
              {t.name}
            </Text>
            <View style={[styles.progressBarBg, { backgroundColor: colors.muted }]}>
              <View style={[styles.progressBarFill, { backgroundColor: tierColor, width: "0%" }]} />
            </View>
            <Text style={[styles.topicPercent, { color: colors.mutedForeground }]}>0%</Text>
          </View>
        );
      })}

      <View style={{ height: insets.bottom + 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    textAlign: "center",
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  heading: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    marginBottom: 16,
  },
  overviewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    marginBottom: 16,
  },
  overviewText: {
    flex: 1,
  },
  overviewTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },
  overviewSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  streakRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  streakCard: {
    flex: 1,
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  streakValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  streakLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    textAlign: "center",
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    marginBottom: 12,
  },
  topicRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  topicDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  topicName: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    flex: 1,
  },
  progressBarBg: {
    width: 60,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  topicPercent: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    width: 30,
    textAlign: "right",
  },
});
