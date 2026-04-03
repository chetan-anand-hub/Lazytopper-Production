import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/context/SubscriptionContext";
import { mathsHPQ, scienceHPQ } from "@workspace/shared-data";
import type { LTSubjectKey, DifficultyLevel } from "@workspace/shared-data";

const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  Easy: "#58cc02",
  Medium: "#ff9600",
  Hard: "#ff4b4b",
};

export default function HPQScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ subject?: string }>();
  const [subject, setSubject] = useState<LTSubjectKey>(
    (params.subject as LTSubjectKey) || "Maths"
  );
  const { isPremium } = useSubscription();

  const questions = useMemo(
    () => (subject === "Maths" ? mathsHPQ : scienceHPQ),
    [subject]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Predicted Questions</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroBanner, { backgroundColor: colors.gold + "15" }]}>
          <Feather name="zap" size={24} color={colors.gold} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitle, { color: colors.foreground }]}>Highly Probable Questions</Text>
            <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>
              AI-predicted from 10 years of CBSE board patterns
            </Text>
          </View>
        </View>

        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggleBtn, subject === "Maths" && { backgroundColor: colors.primary + "15", borderColor: colors.primary }]}
            onPress={() => setSubject("Maths")}
          >
            <Text style={[styles.toggleText, { color: subject === "Maths" ? colors.primary : colors.mutedForeground }]}>Maths</Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, subject === "Science" && { backgroundColor: colors.secondary + "15", borderColor: colors.secondary }]}
            onPress={() => setSubject("Science")}
          >
            <Text style={[styles.toggleText, { color: subject === "Science" ? colors.secondary : colors.mutedForeground }]}>Science</Text>
          </Pressable>
        </View>

        {questions.map((q, idx) => {
          const isLocked = !isPremium && idx >= 2;

          return (
            <View
              key={q.id}
              style={[styles.qCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.qTop}>
                <View style={[styles.confidenceBadge, { backgroundColor: colors.primary + "15" }]}>
                  <Feather name="target" size={12} color={colors.primary} />
                  <Text style={[styles.confidenceText, { color: colors.primary }]}>{q.confidencePercent}% likely</Text>
                </View>
                <View style={[styles.diffBadge, { backgroundColor: DIFFICULTY_COLORS[q.difficulty] + "20" }]}>
                  <Text style={[styles.diffText, { color: DIFFICULTY_COLORS[q.difficulty] }]}>{q.difficulty}</Text>
                </View>
                <View style={[styles.marksBadge, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.marksText, { color: colors.foreground }]}>{q.marks}m</Text>
                </View>
              </View>

              <View style={styles.topicRow}>
                <Text style={[styles.topicLabel, { color: colors.mutedForeground }]}>{q.topic}</Text>
                <Feather name="chevron-right" size={12} color={colors.mutedForeground} />
                <Text style={[styles.topicLabel, { color: colors.mutedForeground }]}>{q.subtopic}</Text>
              </View>

              <Text style={[styles.qText, { color: colors.foreground }]}>{q.text}</Text>

              <View style={[styles.rationaleBox, { backgroundColor: colors.muted }]}>
                <Feather name="info" size={12} color={colors.mutedForeground} />
                <Text style={[styles.rationaleText, { color: colors.mutedForeground }]}>{q.rationale}</Text>
              </View>

              {isLocked && (
                <View style={[styles.lockOverlay, { backgroundColor: "rgba(255,255,255,0.88)" }]}>
                  <Feather name="lock" size={20} color={colors.mutedForeground} />
                  <Text style={[styles.lockText, { color: colors.mutedForeground }]}>Premium</Text>
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: insets.bottom + 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  scrollContent: {
    padding: 16,
  },
  heroBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  heroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  heroSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
    alignItems: "center",
  },
  toggleText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  qCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    overflow: "hidden",
  },
  qTop: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  confidenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  confidenceText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  diffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  diffText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  marksBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  marksText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  topicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  topicLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  qText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 12,
  },
  rationaleBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 8,
  },
  rationaleText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    flex: 1,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    gap: 4,
  },
  lockText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
});
