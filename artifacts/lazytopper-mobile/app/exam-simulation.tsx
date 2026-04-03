import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  mathsExamQuestions,
  scienceExamQuestions,
} from "@workspace/shared-data";
import type { LTSubjectKey, ExamQuestion } from "@workspace/shared-data";

type Phase = "setup" | "exam" | "review";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function ExamSimulationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ subject?: string; paperId?: string }>();
  const subject = (params.subject as LTSubjectKey) || "Maths";

  const [phase, setPhase] = useState<Phase>("setup");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [orChoices, setOrChoices] = useState<Record<string, "main" | "alt">>({});
  const [timeLeft, setTimeLeft] = useState(3 * 60 * 60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const questions = useMemo(
    () => (subject === "Maths" ? mathsExamQuestions : scienceExamQuestions),
    [subject]
  );

  useEffect(() => {
    if (phase === "exam" && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setPhase("review");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [phase, timeLeft]);

  const handleSelectAnswer = useCallback((questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }, []);

  const handleOrChoice = useCallback((questionId: string, choice: "main" | "alt") => {
    setOrChoices((prev) => ({ ...prev, [questionId]: choice }));
  }, []);

  const handleSubmit = useCallback(() => {
    Alert.alert(
      "Submit Exam?",
      "Are you sure you want to submit? You cannot change answers after submission.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          style: "destructive",
          onPress: () => {
            if (timerRef.current) clearInterval(timerRef.current);
            setPhase("review");
          },
        },
      ]
    );
  }, []);

  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  const attemptedCount = Object.keys(answers).length;
  const currentQ = questions[currentIdx];

  const activeQuestion = useMemo((): ExamQuestion => {
    if (!currentQ) return questions[0];
    if (currentQ.orAlternative && orChoices[currentQ.id] === "alt") {
      return currentQ.orAlternative;
    }
    return currentQ;
  }, [currentQ, orChoices, questions]);

  if (phase === "setup") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.setupHeader}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="x" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.setupTitle, { color: colors.foreground }]}>Exam Simulation</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.setupContent}>
          <View style={[styles.setupIcon, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="edit-3" size={40} color={colors.primary} />
          </View>

          <Text style={[styles.setupHeading, { color: colors.foreground }]}>
            {subject} Board Exam
          </Text>
          <Text style={[styles.setupSubheading, { color: colors.mutedForeground }]}>
            Predictive Paper #{params.paperId || "1"}
          </Text>

          <View style={[styles.detailsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {([
              { icon: "clock" as const, label: "Duration", value: "3 Hours" },
              { icon: "award" as const, label: "Total Marks", value: `${totalMarks}` },
              { icon: "list" as const, label: "Questions", value: `${questions.length}` },
              { icon: "layers" as const, label: "Sections", value: "A \u2013 E" },
              { icon: "git-branch" as const, label: "Internal Choice", value: "Available" },
            ]).map((item) => (
              <View key={item.label} style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: colors.muted }]}>
                  <Feather name={item.icon} size={16} color={colors.primary} />
                </View>
                <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
                <Text style={[styles.detailValue, { color: colors.foreground }]}>{item.value}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.rulesCard, { backgroundColor: colors.gold + "10", borderColor: colors.gold + "40" }]}>
            <Feather name="alert-triangle" size={18} color={colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rulesTitle, { color: colors.foreground }]}>Instructions</Text>
              <Text style={[styles.rulesText, { color: colors.mutedForeground }]}>
                {"\u2022"} Answer all questions{"\n"}
                {"\u2022"} Section A: MCQs (1 mark each){"\n"}
                {"\u2022"} Section B: Short answer (2 marks each){"\n"}
                {"\u2022"} Section C: Short answer (3 marks each){"\n"}
                {"\u2022"} Section D: Long answer (5 marks each){"\n"}
                {"\u2022"} Section E: Case-based (4 marks each){"\n"}
                {"\u2022"} Questions with OR have internal choice
              </Text>
            </View>
          </View>

          <Pressable
            style={[styles.startBtn, { backgroundColor: colors.primary }]}
            onPress={() => setPhase("exam")}
          >
            <Feather name="play" size={18} color="#fff" />
            <Text style={styles.startBtnText}>Start Exam</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  if (phase === "review") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.setupHeader}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="x" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.setupTitle, { color: colors.foreground }]}>Results</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.setupContent}>
          <View style={[styles.setupIcon, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="check-circle" size={40} color={colors.primary} />
          </View>

          <Text style={[styles.setupHeading, { color: colors.foreground }]}>Exam Completed!</Text>
          <Text style={[styles.setupSubheading, { color: colors.mutedForeground }]}>
            {subject} \u2013 Predictive Paper #{params.paperId || "1"}
          </Text>

          <View style={[styles.detailsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {([
              { icon: "check-square" as const, label: "Attempted", value: `${attemptedCount}/${questions.length}` },
              { icon: "clock" as const, label: "Time Used", value: formatTime(3 * 60 * 60 - timeLeft) },
              { icon: "percent" as const, label: "Completion", value: `${Math.round((attemptedCount / questions.length) * 100)}%` },
            ]).map((item) => (
              <View key={item.label} style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: colors.muted }]}>
                  <Feather name={item.icon} size={16} color={colors.primary} />
                </View>
                <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
                <Text style={[styles.detailValue, { color: colors.foreground }]}>{item.value}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Question Summary</Text>
          {questions.map((q) => {
            const chosenAlt = orChoices[q.id] === "alt" && q.orAlternative;
            const displayQ = chosenAlt ? q.orAlternative! : q;
            const answerId = chosenAlt ? q.orAlternative!.id : q.id;

            return (
              <View
                key={q.id}
                style={[styles.reviewRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[
                  styles.reviewDot,
                  { backgroundColor: answers[answerId] ? colors.primary : colors.destructive + "60" },
                ]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.reviewQLabel, { color: colors.foreground }]}>
                    {displayQ.id} (Sec {displayQ.section}, {displayQ.marks}m)
                    {q.orAlternative ? (chosenAlt ? " [OR]" : "") : ""}
                  </Text>
                  <Text numberOfLines={1} style={[styles.reviewQText, { color: colors.mutedForeground }]}>
                    {displayQ.questionText}
                  </Text>
                </View>
                <Text style={[styles.reviewStatus, { color: answers[answerId] ? colors.primary : colors.mutedForeground }]}>
                  {answers[answerId] ? "Done" : "Skipped"}
                </Text>
              </View>
            );
          })}

          <Pressable
            style={[styles.startBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={18} color="#fff" />
            <Text style={styles.startBtnText}>Back to Practice</Text>
          </Pressable>

          <View style={{ height: insets.bottom + 32 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.examHeader, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => {
          Alert.alert("Exit Exam?", "Your progress will be lost.", [
            { text: "Continue", style: "cancel" },
            { text: "Exit", style: "destructive", onPress: () => router.back() },
          ]);
        }} style={styles.backBtn}>
          <Feather name="x" size={20} color={colors.foreground} />
        </Pressable>

        <View style={[styles.timerPill, { backgroundColor: timeLeft < 600 ? colors.destructive + "20" : colors.muted }]}>
          <Feather name="clock" size={14} color={timeLeft < 600 ? colors.destructive : colors.foreground} />
          <Text style={[styles.timerText, { color: timeLeft < 600 ? colors.destructive : colors.foreground }]}>
            {formatTime(timeLeft)}
          </Text>
        </View>

        <View style={styles.progressPill}>
          <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
            {attemptedCount}/{questions.length}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.examScrollArea} contentContainerStyle={styles.examScrollContent}>
        <View style={styles.qHeader}>
          <View style={[styles.sectionBadge, { backgroundColor: colors.primary + "20" }]}>
            <Text style={[styles.sectionBadgeText, { color: colors.primary }]}>Section {activeQuestion.section}</Text>
          </View>
          <View style={[styles.marksBadge, { backgroundColor: colors.gold + "20" }]}>
            <Text style={[styles.marksBadgeText, { color: colors.gold }]}>{activeQuestion.marks} mark{activeQuestion.marks > 1 ? "s" : ""}</Text>
          </View>
          {currentQ.orAlternative && (
            <View style={[styles.orBadge, { backgroundColor: colors.secondary + "20" }]}>
              <Text style={[styles.orBadgeText, { color: colors.secondary }]}>OR available</Text>
            </View>
          )}
        </View>

        <Text style={[styles.qNumber, { color: colors.mutedForeground }]}>Question {currentIdx + 1} of {questions.length}</Text>

        {currentQ.orAlternative && (
          <View style={styles.orToggleRow}>
            <Pressable
              style={[
                styles.orToggleBtn,
                {
                  backgroundColor: (orChoices[currentQ.id] || "main") === "main" ? colors.primary + "15" : colors.card,
                  borderColor: (orChoices[currentQ.id] || "main") === "main" ? colors.primary : colors.border,
                },
              ]}
              onPress={() => handleOrChoice(currentQ.id, "main")}
            >
              <Text style={[styles.orToggleText, { color: (orChoices[currentQ.id] || "main") === "main" ? colors.primary : colors.mutedForeground }]}>
                Option A
              </Text>
            </Pressable>
            <Text style={[styles.orLabel, { color: colors.mutedForeground }]}>OR</Text>
            <Pressable
              style={[
                styles.orToggleBtn,
                {
                  backgroundColor: orChoices[currentQ.id] === "alt" ? colors.secondary + "15" : colors.card,
                  borderColor: orChoices[currentQ.id] === "alt" ? colors.secondary : colors.border,
                },
              ]}
              onPress={() => handleOrChoice(currentQ.id, "alt")}
            >
              <Text style={[styles.orToggleText, { color: orChoices[currentQ.id] === "alt" ? colors.secondary : colors.mutedForeground }]}>
                Option B
              </Text>
            </Pressable>
          </View>
        )}

        <Text style={[styles.qText, { color: colors.foreground }]}>{activeQuestion.questionText}</Text>

        {activeQuestion.format === "MCQ" && activeQuestion.options && (
          <View style={styles.optionsContainer}>
            {activeQuestion.options.map((opt, idx) => {
              const selected = answers[activeQuestion.id] === opt;
              return (
                <Pressable
                  key={idx}
                  style={[
                    styles.optionBtn,
                    {
                      backgroundColor: selected ? colors.primary + "15" : colors.card,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handleSelectAnswer(activeQuestion.id, opt)}
                >
                  <View style={[
                    styles.optionRadio,
                    {
                      borderColor: selected ? colors.primary : colors.mutedForeground,
                      backgroundColor: selected ? colors.primary : "transparent",
                    },
                  ]}>
                    {selected && <View style={styles.optionDot} />}
                  </View>
                  <Text style={[styles.optionText, { color: colors.foreground }]}>{opt}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {activeQuestion.format !== "MCQ" && (
          <View style={[styles.writeBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="edit-2" size={16} color={colors.mutedForeground} />
            <Text style={[styles.writeHint, { color: colors.mutedForeground }]}>
              Write your answer on paper, then tap "Mark as Done" below
            </Text>
            <Pressable
              style={[
                styles.markDoneBtn,
                {
                  backgroundColor: answers[activeQuestion.id] ? colors.primary + "15" : colors.muted,
                  borderColor: answers[activeQuestion.id] ? colors.primary : colors.border,
                },
              ]}
              onPress={() => handleSelectAnswer(activeQuestion.id, "answered")}
            >
              <Feather
                name={answers[activeQuestion.id] ? "check-circle" : "circle"}
                size={16}
                color={answers[activeQuestion.id] ? colors.primary : colors.mutedForeground}
              />
              <Text style={{ color: answers[activeQuestion.id] ? colors.primary : colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                {answers[activeQuestion.id] ? "Marked as Done" : "Mark as Done"}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <View style={[styles.navBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.qDots}>
          {questions.map((q, i) => (
            <Pressable
              key={q.id}
              onPress={() => setCurrentIdx(i)}
              style={[
                styles.qDot,
                {
                  backgroundColor:
                    i === currentIdx ? colors.primary
                    : answers[q.id] || (q.orAlternative && answers[q.orAlternative.id]) ? colors.primary + "40"
                    : colors.muted,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.navBtns}>
          <Pressable
            style={[styles.navBtn, { backgroundColor: colors.muted, opacity: currentIdx === 0 ? 0.4 : 1 }]}
            disabled={currentIdx === 0}
            onPress={() => setCurrentIdx((p) => Math.max(0, p - 1))}
          >
            <Feather name="arrow-left" size={18} color={colors.foreground} />
            <Text style={[styles.navBtnText, { color: colors.foreground }]}>Previous</Text>
          </Pressable>

          {currentIdx < questions.length - 1 ? (
            <Pressable
              style={[styles.navBtn, { backgroundColor: colors.primary }]}
              onPress={() => setCurrentIdx((p) => Math.min(questions.length - 1, p + 1))}
            >
              <Text style={[styles.navBtnText, { color: "#fff" }]}>Next</Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </Pressable>
          ) : (
            <Pressable
              style={[styles.navBtn, { backgroundColor: colors.destructive }]}
              onPress={handleSubmit}
            >
              <Text style={[styles.navBtnText, { color: "#fff" }]}>Submit</Text>
              <Feather name="send" size={16} color="#fff" />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  setupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  setupTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  setupContent: {
    padding: 20,
    alignItems: "center",
  },
  setupIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  setupHeading: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    marginBottom: 4,
  },
  setupSubheading: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    marginBottom: 24,
  },
  detailsCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  detailLabel: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  detailValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  rulesCard: {
    width: "100%",
    flexDirection: "row",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 24,
  },
  rulesTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    marginBottom: 6,
  },
  rulesText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
  },
  startBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  examHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timerText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  progressPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  progressText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  examScrollArea: { flex: 1 },
  examScrollContent: { padding: 20 },
  qHeader: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  sectionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sectionBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  marksBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  marksBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  orBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  orToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  orToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
  },
  orToggleText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  orLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  qNumber: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginBottom: 8,
  },
  qText: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 10,
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  optionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  optionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  optionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    flex: 1,
  },
  writeBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    gap: 12,
    alignItems: "center",
  },
  writeHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  markDoneBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  navBar: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  qDots: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
    justifyContent: "center",
  },
  qDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  navBtns: {
    flexDirection: "row",
    gap: 10,
  },
  navBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  navBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    alignSelf: "flex-start",
    marginBottom: 12,
    marginTop: 8,
  },
  reviewRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  reviewDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  reviewQLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  reviewQText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  reviewStatus: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
});
