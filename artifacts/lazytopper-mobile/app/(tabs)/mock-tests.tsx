import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
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
import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/context/SubscriptionContext";
import type { LTSubjectKey } from "@/data/types";

const MOCK_PAPERS = [
  { id: 1, title: "Predictive Paper #1", questions: 38, marks: 80, duration: "3 hrs", difficulty: "Moderate" },
  { id: 2, title: "Predictive Paper #2", questions: 38, marks: 80, duration: "3 hrs", difficulty: "Challenging" },
  { id: 3, title: "Predictive Paper #3", questions: 38, marks: 80, duration: "3 hrs", difficulty: "Easy-Moderate" },
];

export default function MockTestsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [subject, setSubject] = useState<LTSubjectKey>("Maths");
  const { isPremium } = useSubscription();
  const topPad = Platform.OS === "web" ? 67 : 0;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.heading, { color: colors.foreground }]}>Mock Tests</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        AI-predicted exam papers matching CBSE blueprint
      </Text>

      <SubjectToggle selected={subject} onChange={setSubject} />

      <View style={[styles.infoCard, { backgroundColor: colors.secondary + "15", borderColor: colors.secondary }]}>
        <Feather name="info" size={16} color={colors.secondary} />
        <Text style={[styles.infoText, { color: colors.foreground }]}>
          Each paper follows the exact CBSE blueprint: Sections A-E, 80 marks, 3 hours
        </Text>
      </View>

      {MOCK_PAPERS.map((paper) => (
        <View
          key={paper.id}
          style={[styles.paperCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.paperHeader}>
            <View style={[styles.paperIcon, { backgroundColor: colors.primary + "20" }]}>
              <Feather name="file-text" size={20} color={colors.primary} />
            </View>
            <View style={styles.paperInfo}>
              <Text style={[styles.paperTitle, { color: colors.foreground }]}>
                {subject} - {paper.title}
              </Text>
              <Text style={[styles.paperMeta, { color: colors.mutedForeground }]}>
                {paper.questions} questions · {paper.marks} marks · {paper.duration}
              </Text>
            </View>
          </View>

          <View style={styles.paperDetails}>
            <View style={[styles.detailChip, { backgroundColor: colors.muted }]}>
              <Feather name="bar-chart" size={12} color={colors.mutedForeground} />
              <Text style={[styles.detailText, { color: colors.foreground }]}>{paper.difficulty}</Text>
            </View>
            <View style={[styles.detailChip, { backgroundColor: colors.muted }]}>
              <Feather name="clock" size={12} color={colors.mutedForeground} />
              <Text style={[styles.detailText, { color: colors.foreground }]}>{paper.duration}</Text>
            </View>
          </View>

          <View style={styles.paperActions}>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.primary }]}
            >
              <Feather name="eye" size={14} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>View</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.primaryBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="play" size={14} color="#fff" />
              <Text style={[styles.actionText, { color: "#fff" }]}>Start Exam</Text>
            </Pressable>
          </View>

          {!isPremium && paper.id > 1 && (
            <View style={[styles.lockOverlay, { backgroundColor: "rgba(255,255,255,0.85)" }]}>
              <Feather name="lock" size={20} color={colors.mutedForeground} />
              <Text style={[styles.lockText, { color: colors.mutedForeground }]}>Premium</Text>
            </View>
          )}
        </View>
      ))}

      <View style={[styles.tipsCard, { backgroundColor: colors.gold + "15", borderColor: colors.gold }]}>
        <Feather name="star" size={18} color={colors.gold} />
        <View style={styles.tipsContent}>
          <Text style={[styles.tipsTitle, { color: colors.foreground }]}>Exam Tips</Text>
          <Text style={[styles.tipsText, { color: colors.mutedForeground }]}>
            Attempt all questions. Start with Section A MCQs to build confidence. Manage time: 1 min per mark.
          </Text>
        </View>
      </View>

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
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    marginBottom: 20,
  },
  infoText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  paperCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    overflow: "hidden",
  },
  paperHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  paperIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  paperInfo: {
    flex: 1,
  },
  paperTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  paperMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 3,
  },
  paperDetails: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  detailChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  detailText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  paperActions: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  primaryBtn: {
    borderWidth: 0,
  },
  actionText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
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
  tipsCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    alignItems: "flex-start",
    marginTop: 4,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    marginBottom: 4,
  },
  tipsText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
});
