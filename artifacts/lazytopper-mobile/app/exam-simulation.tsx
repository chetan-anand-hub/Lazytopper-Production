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
import type { LTSubjectKey } from "@workspace/shared-data";

type Phase = "setup" | "exam" | "review";

interface ExamQuestion {
  id: number;
  section: string;
  marks: number;
  text: string;
  type: "mcq" | "short" | "long" | "case";
  options?: string[];
}

function generateQuestions(subject: LTSubjectKey): ExamQuestion[] {
  const mathQuestions: ExamQuestion[] = [
    { id: 1, section: "A", marks: 1, text: "If HCF(336, 54) = 6, find LCM(336, 54).", type: "mcq", options: ["3__(a) 3024", "(b) 2_(c) 1_(d) 5765024", "(c) 1008", "(d) 576"] },
    { id: 2, section: "A", marks: 1, text: "The zeroes of the polynomial x² − 3x − 4 are:", type: "mcq", options: ["(a) 4, −1", "(b) −4, 1", "(c) 4, 1", "(d) −4, −1"] },
    { id: 3, section: "A", marks: 1, text: "If tan θ = 5/12, then the value of sin θ is:", type: "mcq", options: ["(a) 5/13", "(b) 12/13", "(c) 13/5", "(d) 13/12"] },
    { id: 4, section: "A", marks: 1, text: "The distance between (2, 3) and (−1, 7) is:", type: "mcq", options: ["(a) 4", "(b) 5", "(c) 6", "(d) 7"] },
    { id: 5, section: "A", marks: 1, text: "Which of the following is irrational?", type: "mcq", options: ["(a) √4", "(b) √9/√16", "(c) √5", "(d) 0.¯3"] },
    { id: 6, section: "B", marks: 2, text: "Find the roots of the quadratic equation 2x² + x − 6 = 0.", type: "short" },
    { id: 7, section: "B", marks: 2, text: "Prove that √3 is irrational.", type: "short" },
    { id: 8, section: "B", marks: 2, text: "Find the 20th term of the AP: 3, 8, 13, 18, ...", type: "short" },
    { id: 9, section: "C", marks: 3, text: "A triangle ABC with vertices A(1,−1), B(0,4) and C(−5,3). Find the area of the triangle.", type: "short" },
    { id: 10, section: "C", marks: 3, text: "Two concentric circles are of radii 5 cm and 3 cm. Find the length of the chord of the larger circle which touches the smaller circle.", type: "short" },
    { id: 11, section: "D", marks: 5, text: "State and prove the Basic Proportionality Theorem (Thales' Theorem). Using this, if DE ∥ BC in △ABC where D and E lie on AB and AC respectively, and AD/DB = 2/3, find AE/EC.", type: "long" },
    { id: 12, section: "D", marks: 5, text: "Draw a pair of tangents to a circle of radius 4 cm from a point 6 cm away from the centre. Describe the steps of construction.", type: "long" },
    { id: 13, section: "E", marks: 4, text: "Case Study: A survey was conducted on 30 families in a locality regarding their monthly expenditure on education. The data is: 1000-1500: 2, 1500-2000: 5, 2000-2500: 8, 2500-3000: 7, 3000-3500: 5, 3500-4000: 3. Find the mean expenditure using the step-deviation method.", type: "case" },
  ];

  const scienceQuestions: ExamQuestion[] = [
    { id: 1, section: "A", marks: 1, text: "The chemical formula of baking soda is:", type: "mcq", options: ["(a) Na₂CO₃", "(b) NaHCO₃", "(c) NaCl", "(d) NaOH"] },
    { id: 2, section: "A", marks: 1, text: "Which of the following is not a type of mirror?", type: "mcq", options: ["(a) Concave", "(b) Convex", "(c) Plane", "(d) Refractive"] },
    { id: 3, section: "A", marks: 1, text: "The SI unit of electric current is:", type: "mcq", options: ["(a) Volt", "(b) Watt", "(c) Ampere", "(d) Ohm"] },
    { id: 4, section: "A", marks: 1, text: "Which gas is evolved when zinc reacts with dilute HCl?", type: "mcq", options: ["(a) O₂", "(b) CO₂", "(c) H₂", "(d) Cl₂"] },
    { id: 5, section: "A", marks: 1, text: "Stomata open and close due to:", type: "mcq", options: ["(a) Xylem", "(b) Phloem", "(c) Guard cells", "(d) Companion cells"] },
    { id: 6, section: "B", marks: 2, text: "What is a homologous series? Give an example with the first three members.", type: "short" },
    { id: 7, section: "B", marks: 2, text: "Define reflex arc. Draw a neat labelled diagram.", type: "short" },
    { id: 8, section: "B", marks: 2, text: "State Ohm's law. What is the resistance of a conductor if V = 12V and I = 3A?", type: "short" },
    { id: 9, section: "C", marks: 3, text: "Explain the process of nutrition in Amoeba with the help of diagrams.", type: "short" },
    { id: 10, section: "C", marks: 3, text: "What happens when dilute hydrochloric acid is added to iron filings? Write balanced chemical equation.", type: "short" },
    { id: 11, section: "D", marks: 5, text: "Draw a ray diagram to show the image formed by a convex lens when the object is placed (i) beyond 2F₁ (ii) at F₁. State the nature, position and size of the image in each case.", type: "long" },
    { id: 12, section: "D", marks: 5, text: "Describe the structure of human heart with a labelled diagram. How does blood flow through the four chambers?", type: "long" },
    { id: 13, section: "E", marks: 4, text: "Case Study: A student set up a circuit with a 9V battery, an ammeter, a voltmeter and three resistors of 2Ω, 3Ω and 4Ω connected in series. (i) Find total resistance. (ii) Find current. (iii) Find potential difference across the 3Ω resistor.", type: "case" },
  ];

  return subject === "Maths" ? mathQuestions : scienceQuestions;
}

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
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(3 * 60 * 60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const questions = useMemo(() => generateQuestions(subject), [subject]);

  useEffect(() => {
    if (phase === "exam" && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
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
  }, [phase]);

  const handleSelectAnswer = useCallback((questionId: number, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }, []);

  const handleSubmit = useCallback(() => {
    Alert.alert(
      "Submit Exam?",
      "Are you sure you want to submit your exam? You cannot change your answers after submission.",
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
            {[
              { icon: "clock" as const, label: "Duration", value: "3 Hours" },
              { icon: "award" as const, label: "Total Marks", value: `${totalMarks}` },
              { icon: "list" as const, label: "Questions", value: `${questions.length}` },
              { icon: "layers" as const, label: "Sections", value: "A – E" },
            ].map((item) => (
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
                • Answer all questions{"\n"}
                • Section A: MCQs (1 mark each){"\n"}
                • Section B: Short answer (2 marks each){"\n"}
                • Section C: Short answer (3 marks each){"\n"}
                • Section D: Long answer (5 marks each){"\n"}
                • Section E: Case-based (4 marks each)
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
            {subject} – Predictive Paper #{params.paperId || "1"}
          </Text>

          <View style={[styles.detailsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[
              { icon: "check-square" as const, label: "Attempted", value: `${attemptedCount}/${questions.length}` },
              { icon: "clock" as const, label: "Time Used", value: formatTime(3 * 60 * 60 - timeLeft) },
              { icon: "percent" as const, label: "Completion", value: `${Math.round((attemptedCount / questions.length) * 100)}%` },
            ].map((item) => (
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
          {questions.map((q) => (
            <View
              key={q.id}
              style={[styles.reviewRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[
                styles.reviewDot,
                { backgroundColor: answers[q.id] ? colors.primary : colors.destructive + "60" },
              ]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.reviewQLabel, { color: colors.foreground }]}>
                  Q{q.id} (Sec {q.section}, {q.marks}m)
                </Text>
                <Text numberOfLines={1} style={[styles.reviewQText, { color: colors.mutedForeground }]}>
                  {q.text}
                </Text>
              </View>
              <Text style={[styles.reviewStatus, { color: answers[q.id] ? colors.primary : colors.mutedForeground }]}>
                {answers[q.id] ? "Done" : "Skipped"}
              </Text>
            </View>
          ))}

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
            <Text style={[styles.sectionBadgeText, { color: colors.primary }]}>Section {currentQ.section}</Text>
          </View>
          <View style={[styles.marksBadge, { backgroundColor: colors.gold + "20" }]}>
            <Text style={[styles.marksBadgeText, { color: colors.gold }]}>{currentQ.marks} mark{currentQ.marks > 1 ? "s" : ""}</Text>
          </View>
        </View>

        <Text style={[styles.qNumber, { color: colors.mutedForeground }]}>Question {currentIdx + 1} of {questions.length}</Text>
        <Text style={[styles.qText, { color: colors.foreground }]}>{currentQ.text}</Text>

        {currentQ.type === "mcq" && currentQ.options && (
          <View style={styles.optionsContainer}>
            {currentQ.options.map((opt, idx) => {
              const selected = answers[currentQ.id] === opt;
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
                  onPress={() => handleSelectAnswer(currentQ.id, opt)}
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

        {currentQ.type !== "mcq" && (
          <View style={[styles.writeBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="edit-2" size={16} color={colors.mutedForeground} />
            <Text style={[styles.writeHint, { color: colors.mutedForeground }]}>
              Write your answer on paper, then tap "Mark as Done" below
            </Text>
            <Pressable
              style={[
                styles.markDoneBtn,
                {
                  backgroundColor: answers[currentQ.id] ? colors.primary + "15" : colors.muted,
                  borderColor: answers[currentQ.id] ? colors.primary : colors.border,
                },
              ]}
              onPress={() => handleSelectAnswer(currentQ.id, "answered")}
            >
              <Feather
                name={answers[currentQ.id] ? "check-circle" : "circle"}
                size={16}
                color={answers[currentQ.id] ? colors.primary : colors.mutedForeground}
              />
              <Text style={{ color: answers[currentQ.id] ? colors.primary : colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                {answers[currentQ.id] ? "Marked as Done" : "Mark as Done"}
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
                    : answers[q.id] ? colors.primary + "40"
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
