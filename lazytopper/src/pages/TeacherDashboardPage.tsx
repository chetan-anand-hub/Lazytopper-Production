import { useCallback, useEffect, useMemo, useState } from "react";
import ReturnContextBar from "../components/ux/ReturnContextBar";
import {
  getCanonicalChapters,
  formatChapterTitle,
  type CanonicalSubjectId,
} from "../data/syllabus/cbse10Canonical";

interface StudentRecord {
  id: string;
  name: string;
  joinedAt: number;
  topicAccuracy: Record<string, number>;
  totalPracticed: number;
  lastActive: number;
}

interface ClassData {
  classId: string;
  joinCode: string;
  className: string;
  createdAt: number;
  students: StudentRecord[];
}

const STORAGE_KEY = "lazytopper.teacherClasses";

function loadClasses(): ClassData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveClasses(classes: ClassData[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(classes));
}

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateDemoStudents(): StudentRecord[] {
  const names = [
    "Aarav Sharma", "Priya Patel", "Rohan Gupta", "Ananya Singh", "Karan Mehta",
    "Ishita Verma", "Arjun Reddy", "Sneha Joshi", "Vivek Kumar", "Diya Nair",
    "Ravi Tiwari", "Meera Iyer", "Siddharth Das", "Pooja Rao", "Amit Thakur",
  ];
  const chapters = getCanonicalChapters("maths");
  return names.map((name, i) => {
    const topicAccuracy: Record<string, number> = {};
    chapters.forEach((ch) => {
      topicAccuracy[ch.canonicalSlug] = Math.floor(30 + Math.random() * 65);
    });
    return {
      id: `demo_${i}`,
      name,
      joinedAt: Date.now() - Math.floor(Math.random() * 30 * 86400000),
      topicAccuracy,
      totalPracticed: Math.floor(20 + Math.random() * 200),
      lastActive: Date.now() - Math.floor(Math.random() * 7 * 86400000),
    };
  });
}

export default function TeacherDashboardPage() {
  const [classes, setClasses] = useState<ClassData[]>(loadClasses);
  const [newClassName, setNewClassName] = useState("");
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<CanonicalSubjectId>("maths");
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    saveClasses(classes);
  }, [classes]);

  const activeClass = useMemo(
    () => classes.find((c) => c.classId === activeClassId) || null,
    [classes, activeClassId],
  );

  const handleCreateClass = useCallback(() => {
    const trimmed = newClassName.trim();
    if (!trimmed) return;
    const newClass: ClassData = {
      classId: `class_${Date.now()}`,
      joinCode: generateJoinCode(),
      className: trimmed,
      createdAt: Date.now(),
      students: generateDemoStudents(),
    };
    setClasses((prev) => [...prev, newClass]);
    setActiveClassId(newClass.classId);
    setNewClassName("");
  }, [newClassName]);

  const handleCopyCode = useCallback(
    (code: string) => {
      navigator.clipboard.writeText(code).catch(() => {});
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    },
    [],
  );

  const chapters = useMemo(() => getCanonicalChapters(selectedSubject), [selectedSubject]);

  const classStats = useMemo(() => {
    if (!activeClass) return null;
    const students = activeClass.students;
    if (students.length === 0) return null;

    const avgAccuracyByTopic: Record<string, number> = {};
    chapters.forEach((ch) => {
      const values = students
        .map((s) => s.topicAccuracy[ch.canonicalSlug])
        .filter((v) => v !== undefined);
      avgAccuracyByTopic[ch.canonicalSlug] =
        values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
    });

    const overallAccuracies = students.map((s) => {
      const vals = Object.values(s.topicAccuracy);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    });
    const classAvg = Math.round(
      overallAccuracies.reduce((a, b) => a + b, 0) / overallAccuracies.length,
    );

    const struggling = students
      .filter((s) => {
        const vals = Object.values(s.topicAccuracy);
        const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        return avg < 45;
      })
      .sort((a, b) => {
        const avgA = Object.values(a.topicAccuracy).reduce((x, y) => x + y, 0) / Object.values(a.topicAccuracy).length;
        const avgB = Object.values(b.topicAccuracy).reduce((x, y) => x + y, 0) / Object.values(b.topicAccuracy).length;
        return avgA - avgB;
      });

    const readinessFactors = overallAccuracies.map((acc) => Math.min(acc / 70, 1));
    const readiness = Math.round(
      (readinessFactors.reduce((a, b) => a + b, 0) / readinessFactors.length) * 100,
    );

    return { avgAccuracyByTopic, classAvg, struggling, readiness };
  }, [activeClass, chapters]);

  function heatmapColor(value: number): string {
    if (value >= 70) return "#22c55e";
    if (value >= 50) return "#f59e0b";
    if (value >= 30) return "#f97316";
    return "#ef4444";
  }

  if (!activeClass) {
    return (
      <div className="dark-page">
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "16px 16px 100px" }}>
          <ReturnContextBar backTo="/dashboard" backLabel="Back to Dashboard" />

          <section
            style={{
              marginTop: 20,
              borderRadius: 20,
              padding: "28px 24px",
              background:
                "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(59,130,246,0.08) 100%)",
              border: "1px solid rgba(139,92,246,0.15)",
            }}
          >
            <h1
              className="font-display"
              style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", margin: "0 0 8px" }}
            >
              Teacher Dashboard
            </h1>
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", margin: 0 }}>
              Create a class, share the join code with your students, and track their progress.
            </p>
          </section>

          <section style={{ marginTop: 24 }}>
            <h2
              className="font-display"
              style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", marginBottom: 12 }}
            >
              Create New Class
            </h2>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="e.g. Class 10-A Maths"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateClass()}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#fff",
                  fontSize: "0.88rem",
                  outline: "none",
                }}
              />
              <button
                onClick={handleCreateClass}
                disabled={!newClassName.trim()}
                style={{
                  padding: "10px 20px",
                  borderRadius: 12,
                  border: "none",
                  background: newClassName.trim() ? "#8b5cf6" : "#64748b",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: newClassName.trim() ? "pointer" : "default",
                }}
              >
                Create Class
              </button>
            </div>
          </section>

          {classes.length > 0 && (
            <section style={{ marginTop: 24 }}>
              <h2
                className="font-display"
                style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", marginBottom: 12 }}
              >
                Your Classes
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {classes.map((cls) => (
                  <button
                    key={cls.classId}
                    onClick={() => setActiveClassId(cls.classId)}
                    style={{
                      textAlign: "left",
                      padding: "14px 18px",
                      borderRadius: 14,
                      border: "1px solid rgba(139,92,246,0.15)",
                      background: "rgba(255,255,255,0.03)",
                      cursor: "pointer",
                      color: "#fff",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{cls.className}</div>
                    <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                      Join code: <strong style={{ color: "#8b5cf6" }}>{cls.joinCode}</strong>
                      {" · "}
                      {cls.students.length} students
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dark-page">
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "16px 16px 100px" }}>
        <ReturnContextBar
          backTo="/dashboard"
          backLabel="Back to Dashboard"
          quickLinks={[
            { label: "All Classes", to: "/teacher" },
            { label: "Trends", to: "/trends/10/Maths" },
          ]}
        />
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => setActiveClassId(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "#8b5cf6",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              padding: 0,
            }}
          >
            ← All Classes
          </button>
        </div>

        <section
          style={{
            marginTop: 16,
            borderRadius: 20,
            padding: "24px",
            background:
              "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(59,130,246,0.08) 100%)",
            border: "1px solid rgba(139,92,246,0.15)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1
                className="font-display"
                style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff", margin: "0 0 4px" }}
              >
                {activeClass.className}
              </h1>
              <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)" }}>
                {activeClass.students.length} students · Created{" "}
                {new Date(activeClass.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  padding: "8px 16px",
                  borderRadius: 12,
                  background: "rgba(139,92,246,0.15)",
                  border: "1px solid rgba(139,92,246,0.3)",
                  fontFamily: "'Space Grotesk', monospace",
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  color: "#a78bfa",
                  letterSpacing: "0.15em",
                }}
              >
                {activeClass.joinCode}
              </div>
              <button
                onClick={() => handleCopyCode(activeClass.joinCode)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: copiedCode ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.04)",
                  color: copiedCode ? "#22c55e" : "rgba(255,255,255,0.6)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {copiedCode ? "Copied!" : "Copy Code"}
              </button>
            </div>
          </div>

          {classStats && (
            <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
              <div
                style={{
                  flex: "1 1 140px",
                  padding: "12px 16px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.06)",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#22c55e" }}>
                  {classStats.readiness}%
                </div>
                <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
                  Class Readiness
                </div>
              </div>
              <div
                style={{
                  flex: "1 1 140px",
                  padding: "12px 16px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.06)",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#3b82f6" }}>
                  {classStats.classAvg}%
                </div>
                <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
                  Average Accuracy
                </div>
              </div>
              <div
                style={{
                  flex: "1 1 140px",
                  padding: "12px 16px",
                  borderRadius: 14,
                  background: classStats.struggling.length > 0 ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.06)",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "1.8rem",
                    fontWeight: 800,
                    color: classStats.struggling.length > 0 ? "#ef4444" : "#22c55e",
                  }}
                >
                  {classStats.struggling.length}
                </div>
                <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
                  Struggling Students
                </div>
              </div>
            </div>
          )}
        </section>

        <section style={{ marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2
              className="font-display"
              style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", margin: 0 }}
            >
              Topic-wise Mastery Heatmap
            </h2>
            <div style={{ borderRadius: 10, padding: 3, background: "rgba(255,255,255,0.06)", display: "inline-flex", gap: 3 }}>
              {(["maths", "science"] as CanonicalSubjectId[]).map((subj) => {
                const active = subj === selectedSubject;
                return (
                  <button
                    key={subj}
                    onClick={() => setSelectedSubject(subj)}
                    style={{
                      padding: "5px 14px",
                      borderRadius: 8,
                      border: "none",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      background: active ? "#8b5cf6" : "transparent",
                      color: active ? "#fff" : "rgba(255,255,255,0.5)",
                    }}
                  >
                    {subj === "maths" ? "Maths" : "Science"}
                  </button>
                );
              })}
            </div>
          </div>

          {classStats && (
            <div
              style={{
                overflowX: "auto",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", minWidth: 500 }}>
                {chapters.map((ch) => {
                  const avg = classStats.avgAccuracyByTopic[ch.canonicalSlug] || 0;
                  return (
                    <div
                      key={ch.chapterId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "8px 16px",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      <div
                        style={{
                          width: 200,
                          flexShrink: 0,
                          fontSize: "0.78rem",
                          color: "rgba(255,255,255,0.7)",
                          fontWeight: 500,
                        }}
                      >
                        {formatChapterTitle(ch)}
                      </div>
                      <div style={{ flex: 1, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${avg}%`,
                            borderRadius: 999,
                            background: heatmapColor(avg),
                            transition: "width 0.5s ease",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          width: 48,
                          textAlign: "right",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          color: heatmapColor(avg),
                        }}
                      >
                        {avg}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {classStats && classStats.struggling.length > 0 && (
          <section style={{ marginTop: 24 }}>
            <h2
              className="font-display"
              style={{ fontSize: "1rem", fontWeight: 700, color: "#ef4444", marginBottom: 12 }}
            >
              Students Who Need Help
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {classStats.struggling.map((student) => {
                const avg = Math.round(
                  Object.values(student.topicAccuracy).reduce((a, b) => a + b, 0) /
                    Object.values(student.topicAccuracy).length,
                );
                const daysAgo = Math.floor((Date.now() - student.lastActive) / 86400000);
                return (
                  <div
                    key={student.id}
                    style={{
                      padding: "12px 16px",
                      borderRadius: 12,
                      background: "rgba(239,68,68,0.06)",
                      border: "1px solid rgba(239,68,68,0.15)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "rgba(255,255,255,0.85)" }}>
                        {student.name}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                        {student.totalPracticed} questions practiced · Last active {daysAgo === 0 ? "today" : `${daysAgo}d ago`}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#ef4444" }}>{avg}%</div>
                      <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)" }}>avg accuracy</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section style={{ marginTop: 24 }}>
          <h2
            className="font-display"
            style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", marginBottom: 12 }}
          >
            All Students
          </h2>
          <div
            style={{
              overflowX: "auto",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <th style={{ textAlign: "left", padding: "10px 16px", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Name</th>
                  <th style={{ textAlign: "right", padding: "10px 16px", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Avg Accuracy</th>
                  <th style={{ textAlign: "right", padding: "10px 16px", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Qs Practiced</th>
                  <th style={{ textAlign: "right", padding: "10px 16px", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Last Active</th>
                </tr>
              </thead>
              <tbody>
                {activeClass.students
                  .slice()
                  .sort((a, b) => {
                    const avgA = Object.values(a.topicAccuracy).reduce((x, y) => x + y, 0) / Object.values(a.topicAccuracy).length;
                    const avgB = Object.values(b.topicAccuracy).reduce((x, y) => x + y, 0) / Object.values(b.topicAccuracy).length;
                    return avgB - avgA;
                  })
                  .map((student) => {
                    const avg = Math.round(
                      Object.values(student.topicAccuracy).reduce((a, b) => a + b, 0) /
                        Object.values(student.topicAccuracy).length,
                    );
                    const daysAgo = Math.floor((Date.now() - student.lastActive) / 86400000);
                    return (
                      <tr
                        key={student.id}
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                      >
                        <td style={{ padding: "10px 16px", color: "rgba(255,255,255,0.85)" }}>
                          {student.name}
                        </td>
                        <td
                          style={{
                            padding: "10px 16px",
                            textAlign: "right",
                            fontWeight: 700,
                            color: heatmapColor(avg),
                          }}
                        >
                          {avg}%
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "rgba(255,255,255,0.6)" }}>
                          {student.totalPracticed}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right", color: "rgba(255,255,255,0.4)" }}>
                          {daysAgo === 0 ? "Today" : `${daysAgo}d ago`}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
