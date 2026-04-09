import { useNavigate } from "react-router-dom";
import { getHighlyProbableQuestions } from "../data/highlyProbableQuestions";
import type { HPQQuestion } from "../data/highlyProbableQuestions";
import ReturnContextBar from "../components/ux/ReturnContextBar";

const KEY_FORMULAS: { subject: string; topic: string; formulas: string[] }[] = [
  { subject: "Maths", topic: "Real Numbers", formulas: ["HCF × LCM = Product of two numbers", "Euclid's Division Lemma: a = bq + r"] },
  { subject: "Maths", topic: "Polynomials", formulas: ["Sum of zeroes = −b/a", "Product of zeroes = c/a (quadratic)"] },
  { subject: "Maths", topic: "Quadratic Equations", formulas: ["x = (−b ± √(b²−4ac)) / 2a", "Discriminant D = b²−4ac"] },
  { subject: "Maths", topic: "Arithmetic Progressions", formulas: ["aₙ = a + (n−1)d", "Sₙ = n/2 [2a + (n−1)d]"] },
  { subject: "Maths", topic: "Coordinate Geometry", formulas: ["Distance = √[(x₂−x₁)² + (y₂−y₁)²]", "Section formula: ((mx₂+nx₁)/(m+n), (my₂+ny₁)/(m+n))"] },
  { subject: "Maths", topic: "Trigonometry", formulas: ["sin²θ + cos²θ = 1", "1 + tan²θ = sec²θ", "1 + cot²θ = cosec²θ"] },
  { subject: "Maths", topic: "Circles", formulas: ["Tangent ⊥ radius at point of contact", "Tangents from external point are equal"] },
  { subject: "Maths", topic: "Areas Related to Circles", formulas: ["Area of sector = (θ/360) × πr²", "Length of arc = (θ/360) × 2πr"] },
  { subject: "Maths", topic: "Surface Areas & Volumes", formulas: ["TSA of cylinder = 2πr(r+h)", "Volume of cone = ⅓πr²h", "Volume of sphere = 4/3 πr³"] },
  { subject: "Maths", topic: "Statistics", formulas: ["Mean = Σfᵢxᵢ / Σfᵢ", "Mode = l + [(f₁−f₀)/(2f₁−f₀−f₂)] × h"] },
  { subject: "Science", topic: "Chemical Reactions", formulas: ["Types: Combination, Decomposition, Displacement, Double Displacement, Redox"] },
  { subject: "Science", topic: "Acids, Bases & Salts", formulas: ["pH scale: 0-14 (7 = neutral)", "Acid + Base → Salt + Water"] },
  { subject: "Science", topic: "Electricity", formulas: ["V = IR (Ohm's law)", "P = VI = I²R = V²/R", "Series: R = R₁+R₂+R₃", "Parallel: 1/R = 1/R₁+1/R₂+1/R₃"] },
  { subject: "Science", topic: "Light", formulas: ["Mirror: 1/f = 1/v + 1/u", "Lens: 1/f = 1/v − 1/u", "m = −v/u (mirror), m = v/u (lens)"] },
  { subject: "Science", topic: "Magnetic Effects", formulas: ["Fleming's Left Hand Rule (motor)", "Fleming's Right Hand Rule (generator)"] },
];

const EXAM_TIPS = [
  { icon: "😴", text: "Sleep by 10 PM — your brain consolidates memory during sleep." },
  { icon: "💧", text: "Keep a water bottle ready for the exam hall." },
  { icon: "🏫", text: "Reach the exam center 30 minutes early." },
  { icon: "📝", text: "Read all questions first before starting. Plan your time." },
  { icon: "✅", text: "Attempt all questions — there's no negative marking in CBSE." },
  { icon: "🔢", text: "Show all steps in calculations — marks are given for method." },
  { icon: "📏", text: "Carry extra pens, pencils, ruler, and geometry box." },
  { icon: "🧘", text: "If you feel stuck, take 3 deep breaths and move to the next question." },
];

const CONFIDENCE_MESSAGES = [
  "You've put in the work. Trust your preparation.",
  "Thousands of students have felt exactly like you — and they did great.",
  "One exam doesn't define you. But you're more prepared than you think.",
  "Tomorrow is just another day of showing what you already know.",
  "Your best is enough. Go in confident.",
];

function getTop20Questions(): { subject: string; question: HPQQuestion }[] {
  const mathsBuckets = getHighlyProbableQuestions("Maths");
  const scienceBuckets = getHighlyProbableQuestions("Science");

  const all: { subject: string; question: HPQQuestion; score: number }[] = [];

  const likelihoodScore = (l: string) => l === "Very High" ? 4 : l === "High" ? 3 : l === "Medium-High" ? 2 : 1;

  for (const bucket of mathsBuckets) {
    for (const q of bucket.questions) {
      all.push({ subject: "Maths", question: q, score: likelihoodScore(q.likelihood) });
    }
  }
  for (const bucket of scienceBuckets) {
    for (const q of bucket.questions) {
      all.push({ subject: "Science", question: q, score: likelihoodScore(q.likelihood) });
    }
  }

  all.sort((a, b) => b.score - a.score);
  return all.slice(0, 20).map(({ subject, question }) => ({ subject, question }));
}

export default function NightBeforePage() {
  const navigate = useNavigate();
  const topQuestions = getTop20Questions();
  const randomMessage = CONFIDENCE_MESSAGES[Math.floor(Math.random() * CONFIDENCE_MESSAGES.length)];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", paddingBottom: 80 }}>
      <div style={{ maxWidth: 500, margin: "0 auto", padding: "16px 16px 32px" }}>
        <ReturnContextBar backTo="/dashboard" backLabel="Back to Dashboard" />

        <div style={{
          marginTop: 24, padding: "28px 24px", borderRadius: 20,
          background: "linear-gradient(135deg, rgba(34,197,94,0.12), rgba(59,130,246,0.08))",
          border: "1px solid rgba(34,197,94,0.2)", textAlign: "center", marginBottom: 24,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🌙</div>
          <h1 style={{
            fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 0 8px",
            fontFamily: "'Space Grotesk', sans-serif",
          }}>Night Before Exam</h1>
          <p style={{ fontSize: 15, color: "#22c55e", fontWeight: 600, margin: "0 0 12px", fontStyle: "italic" }}>
            "{randomMessage}"
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.5 }}>
            No new learning tonight. Just quick revision, key formulas, and rest.
          </p>
        </div>

        <div style={{
          padding: "20px 18px", borderRadius: 16, marginBottom: 20,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: "0 0 16px", fontFamily: "'Space Grotesk', sans-serif" }}>
            📐 Key Formulas
          </h2>
          {KEY_FORMULAS.map((section, idx) => (
            <div key={idx} style={{ marginBottom: idx < KEY_FORMULAS.length - 1 ? 14 : 0 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: section.subject === "Maths" ? "#3b82f6" : "#22c55e",
                textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4,
              }}>
                {section.subject} · {section.topic}
              </div>
              {section.formulas.map((f, fi) => (
                <div key={fi} style={{
                  fontSize: 13, color: "rgba(255,255,255,0.75)", padding: "4px 0",
                  borderBottom: fi < section.formulas.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {f}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{
          padding: "20px 18px", borderRadius: 16, marginBottom: 20,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: "0 0 16px", fontFamily: "'Space Grotesk', sans-serif" }}>
            🎯 Top 20 Most-Predicted Questions
          </h2>
          {topQuestions.map((item, idx) => (
            <div key={idx} style={{
              padding: "12px 0",
              borderBottom: idx < topQuestions.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{
                  fontSize: 11, fontWeight: 800, color: "#000", minWidth: 22, height: 22,
                  borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: item.subject === "Maths" ? "#3b82f6" : "#22c55e", flexShrink: 0,
                }}>{idx + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>
                    {item.question.question}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
                    {item.subject} · {item.question.topic || "General"} · {item.question.likelihood}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          padding: "20px 18px", borderRadius: 16, marginBottom: 20,
          background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)",
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: "0 0 16px", fontFamily: "'Space Grotesk', sans-serif" }}>
            📋 Exam Day Checklist
          </h2>
          {EXAM_TIPS.map((tip, idx) => (
            <div key={idx} style={{
              display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0",
              borderBottom: idx < EXAM_TIPS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{tip.icon}</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>{tip.text}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate("/dashboard")}
          style={{
            width: "100%", padding: "16px 0", borderRadius: 14, border: "none",
            background: "#22c55e", color: "#000", fontWeight: 800, fontSize: 16,
            fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer",
            boxShadow: "0 0 24px rgba(34,197,94,0.3)",
          }}
        >
          You've got this! 💪
        </button>
      </div>
    </div>
  );
}
