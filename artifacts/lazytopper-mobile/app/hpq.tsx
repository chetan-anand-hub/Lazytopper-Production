import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
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

import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/context/SubscriptionContext";
import type { LTSubjectKey } from "@workspace/shared-data";

interface HPQQuestion {
  id: string;
  topic: string;
  subtopic: string;
  text: string;
  marks: number;
  difficulty: "Easy" | "Medium" | "Hard";
  confidencePercent: number;
  rationale: string;
}

const MATHS_HPQ: HPQQuestion[] = [
  {
    id: "HPQ-M1",
    topic: "Trigonometry",
    subtopic: "Heights & Distances",
    text: "From the top of a 7m high building, the angle of elevation of the top of a tower is 60° and the angle of depression of its foot is 45°. Find the height of the tower.",
    marks: 5,
    difficulty: "Hard",
    confidencePercent: 94,
    rationale: "Appears 9/10 years, matches SQP 2025, NEP application focus",
  },
  {
    id: "HPQ-M2",
    topic: "Triangles",
    subtopic: "BPT (Thales' Theorem)",
    text: "State and prove the Basic Proportionality Theorem. Using this, if in △ABC, DE ∥ BC with AD = 4cm, DB = 5cm and AE = 4.5cm, find EC.",
    marks: 5,
    difficulty: "Hard",
    confidencePercent: 92,
    rationale: "Must-appear archetype — guaranteed proof every year",
  },
  {
    id: "HPQ-M3",
    topic: "Statistics",
    subtopic: "Mean (Step Deviation)",
    text: "The following table gives production yield per hectare of wheat of 100 farms. Find the mean using step deviation: 50-55: 2, 55-60: 8, 60-65: 12, 65-70: 24, 70-75: 38, 75-80: 16.",
    marks: 3,
    difficulty: "Medium",
    confidencePercent: 89,
    rationale: "High frequency 8/10 years, SQP aligned, easy scoring",
  },
  {
    id: "HPQ-M4",
    topic: "Coordinate Geometry",
    subtopic: "Section Formula",
    text: "Find the ratio in which the y-axis divides the line segment joining the points (5, −6) and (−1, −4). Also find the point of intersection.",
    marks: 3,
    difficulty: "Medium",
    confidencePercent: 87,
    rationale: "Alternates with distance formula; due this year per rotation",
  },
  {
    id: "HPQ-M5",
    topic: "Quadratic Equations",
    subtopic: "Word Problems",
    text: "The sum of the ages of two friends is 20 years. Four years ago, the product of their ages was 48. Find their present ages.",
    marks: 3,
    difficulty: "Medium",
    confidencePercent: 85,
    rationale: "NEP real-life context emphasis, appears 7/10 years",
  },
];

const SCIENCE_HPQ: HPQQuestion[] = [
  {
    id: "HPQ-S1",
    topic: "Electricity",
    subtopic: "Ohm's Law Numerical",
    text: "A wire of resistance 20Ω is drawn so that its length increases to 3 times its original length. Calculate the new resistance of the wire.",
    marks: 3,
    difficulty: "Medium",
    confidencePercent: 93,
    rationale: "Must-appear archetype — Ohm's law appears every year",
  },
  {
    id: "HPQ-S2",
    topic: "Light – Reflection & Refraction",
    subtopic: "Convex Lens Ray Diagram",
    text: "Draw ray diagrams for image formation by a convex lens for objects placed (i) between F and 2F, (ii) at 2F. State nature, size and position of image.",
    marks: 5,
    difficulty: "Hard",
    confidencePercent: 91,
    rationale: "High ROI topic, appears 9/10 years with diagrams",
  },
  {
    id: "HPQ-S3",
    topic: "Life Processes",
    subtopic: "Human Heart",
    text: "Describe the structure and working of the human heart. Draw a labelled diagram. Why is double circulation necessary?",
    marks: 5,
    difficulty: "Hard",
    confidencePercent: 90,
    rationale: "Guaranteed biology long answer, SQP 2025 aligned",
  },
  {
    id: "HPQ-S4",
    topic: "Chemical Reactions",
    subtopic: "Balancing Equations",
    text: "What happens when zinc granules are treated with dilute hydrochloric acid? Write the balanced chemical equation. What type of reaction is this?",
    marks: 2,
    difficulty: "Easy",
    confidencePercent: 88,
    rationale: "Most frequent chemistry question type, 8/10 years",
  },
  {
    id: "HPQ-S5",
    topic: "Carbon & its Compounds",
    subtopic: "Homologous Series",
    text: "What is a homologous series? Write the first three members of the alcohol series. What are the characteristics of a homologous series?",
    marks: 3,
    difficulty: "Medium",
    confidencePercent: 86,
    rationale: "NEP-aligned conceptual question, rising frequency trend",
  },
];

const DIFFICULTY_COLORS: Record<string, string> = {
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
    () => (subject === "Maths" ? MATHS_HPQ : SCIENCE_HPQ),
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
