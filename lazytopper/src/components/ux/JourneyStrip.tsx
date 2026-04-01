import { useNavigate } from "react-router-dom";

type JourneyStepKey = "trends" | "topichub" | "practice" | "hpq";

type JourneyStep = {
  key: JourneyStepKey;
  label: string;
  to: string;
};

const DEFAULT_STEPS: JourneyStep[] = [
  { key: "trends", label: "1. Trends", to: "/trends/10/Maths" },
  { key: "topichub", label: "2. TopicHub", to: "/topic-hub" },
  { key: "practice", label: "3. Practice", to: "/practice/10/Maths" },
  { key: "hpq", label: "4. HPQ", to: "/highly-probable/10/Maths" },
];

export default function JourneyStrip(props: {
  current: JourneyStepKey;
  grade: string;
  subject: string;
  topic?: string;
}) {
  const navigate = useNavigate();
  const grade = String(props.grade || "10");
  const subject = String(props.subject || "Maths");
  const topic = String(props.topic || "").trim();
  const topicQuery = topic ? `?topic=${encodeURIComponent(topic)}` : "";
  const safeSubject = encodeURIComponent(subject);

  const steps: JourneyStep[] = [
    { key: "trends", label: "1. Trends", to: `/trends/${grade}/${safeSubject}` },
    { key: "topichub", label: "2. TopicHub", to: topic ? `/topic-hub/${grade}/${safeSubject}/${encodeURIComponent(topic)}` : `/topic-hub/${grade}/${safeSubject}` },
    { key: "practice", label: "3. Practice", to: `/practice/${grade}/${safeSubject}${topicQuery}` },
    { key: "hpq", label: "4. HPQ", to: `/highly-probable/${grade}/${safeSubject}${topicQuery}` },
  ];

  return (
    <nav className="ux-journey-strip" aria-label="Study journey" data-testid="ux-journey-strip">
      <div className="ux-journey-strip__title">Your journey</div>
      <div className="ux-journey-strip__row">
        {(steps.length ? steps : DEFAULT_STEPS).map((step) => {
          const active = step.key === props.current;
          return (
            <button
              key={step.key}
              type="button"
              className="ux-journey-strip__chip"
              aria-current={active ? "step" : undefined}
              data-active={active ? "true" : "false"}
              onClick={() => navigate(step.to)}
            >
              {step.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
