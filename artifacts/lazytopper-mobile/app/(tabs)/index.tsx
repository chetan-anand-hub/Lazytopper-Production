import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { useColors } from "@/hooks/useColors";

const FEATURES = [
  { icon: "trending-up" as const, title: "Topic Trends", desc: "10 yrs of CBSE data analysed", color: "#58cc02" },
  { icon: "file-text" as const, title: "Mock Papers", desc: "AI-predicted exam papers", color: "#1cb0f6" },
  { icon: "bar-chart-2" as const, title: "Progress", desc: "Track your mastery", color: "#ff9600" },
  { icon: "award" as const, title: "Smart Practice", desc: "500+ board-style questions", color: "#ce82ff" },
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, signInAsGuest } = useAuth();
  const { isTrialActive, daysLeftInTrial, tier } = useSubscription();
  const topPad = Platform.OS === "web" ? 67 : 0;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>Know what's coming{"\n"}in your board exam</Text>
          <Text style={styles.heroSubtitle}>
            AI-powered predictions from 10 years of CBSE papers
          </Text>
          <View style={styles.heroCtas}>
            <Pressable
              style={[styles.heroCta, { backgroundColor: "#ffffff" }]}
              onPress={() => router.push("/(tabs)/trends")}
            >
              <Feather name="trending-up" size={16} color={colors.primary} />
              <Text style={[styles.heroCtaText, { color: colors.primary }]}>See Trends</Text>
            </Pressable>
            <Pressable
              style={[styles.heroCta, { backgroundColor: "rgba(255,255,255,0.2)" }]}
              onPress={() => router.push("/(tabs)/practice")}
            >
              <Feather name="file-text" size={16} color="#ffffff" />
              <Text style={[styles.heroCtaText, { color: "#ffffff" }]}>Practice</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {isTrialActive && (
        <View style={[styles.trialBanner, { backgroundColor: colors.gold + "20", borderColor: colors.gold }]}>
          <Feather name="clock" size={16} color={colors.gold} />
          <Text style={[styles.trialText, { color: colors.foreground }]}>
            {daysLeftInTrial}d left in your free trial
          </Text>
        </View>
      )}

      {user && (
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIconBg, { backgroundColor: colors.orange + "20" }]}>
              <Feather name="zap" size={18} color={colors.orange} />
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>0</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Day Streak</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIconBg, { backgroundColor: colors.green + "20" }]}>
              <Feather name="check-circle" size={18} color={colors.green} />
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>0/5</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Daily Goal</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIconBg, { backgroundColor: colors.blue + "20" }]}>
              <Feather name="target" size={18} color={colors.blue} />
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {tier === "premium" ? "Pro" : tier === "trial" ? "Trial" : "Free"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Plan</Text>
          </View>
        </View>
      )}

      <View style={styles.subjectsSection}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Choose Subject</Text>
        <View style={styles.subjectCards}>
          <Pressable
            style={({ pressed }) => [
              styles.subjectCard,
              { backgroundColor: colors.primary + "15", borderColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => router.push("/(tabs)/trends")}
          >
            <View style={[styles.subjectIcon, { backgroundColor: colors.primary }]}>
              <Feather name="triangle" size={24} color="#fff" />
            </View>
            <Text style={[styles.subjectName, { color: colors.foreground }]}>Maths</Text>
            <Text style={[styles.subjectMeta, { color: colors.mutedForeground }]}>14 chapters</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.subjectCard,
              { backgroundColor: colors.secondary + "15", borderColor: colors.secondary, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => router.push("/(tabs)/trends")}
          >
            <View style={[styles.subjectIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="zap" size={24} color="#fff" />
            </View>
            <Text style={[styles.subjectName, { color: colors.foreground }]}>Science</Text>
            <Text style={[styles.subjectMeta, { color: colors.mutedForeground }]}>13 chapters</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.featuresSection}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Features</Text>
        {FEATURES.map((f) => (
          <View key={f.title} style={[styles.featureRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.featureIconBg, { backgroundColor: f.color + "20" }]}>
              <Feather name={f.icon} size={20} color={f.color} />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={[styles.featureTitle, { color: colors.foreground }]}>{f.title}</Text>
              <Text style={[styles.featureDesc, { color: colors.mutedForeground }]}>{f.desc}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </View>
        ))}
      </View>

      <View style={{ height: insets.bottom + 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16 },
  heroCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  heroContent: {},
  heroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: "#ffffff",
    lineHeight: 28,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 20,
  },
  heroCtas: {
    flexDirection: "row",
    gap: 10,
  },
  heroCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  heroCtaText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  trialBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  trialText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  subjectsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    marginBottom: 14,
  },
  subjectCards: {
    flexDirection: "row",
    gap: 12,
  },
  subjectCard: {
    flex: 1,
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 10,
  },
  subjectIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  subjectName: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  subjectMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  featuresSection: {
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  featureIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTextCol: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  featureDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
});
