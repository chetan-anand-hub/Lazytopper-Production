/**
 * SEO-DAILY-1 - the ONE inbound link to the daily-question hub from the product's public pages (/cbse/class-10, /question-bank-class-10).
 * Not in any nav. VITE_DAILY_QUESTION_DISABLED=1 renders nothing (today's page).
 */
import { Link } from "react-router-dom";
import { DAILY_HUB_PATH } from "./dailyQuestions";

export const DAILY_LINK_LABEL = "Today’s Important Question";

export function isDailyQuestionLinkKilled(): boolean {
  try {
    return /^(1|true|on|yes)$/i.test(String(import.meta.env.VITE_DAILY_QUESTION_DISABLED ?? "").trim());
  } catch {
    return false;
  }
}

export default function DailyQuestionLink({ className }: { className?: string }) {
  if (isDailyQuestionLinkKilled()) return null;
  return (
    <p className={className ?? "lt-dq-inbound"} data-testid="daily-question-link">
      <Link to={DAILY_HUB_PATH}>{DAILY_LINK_LABEL} &rarr;</Link>
    </p>
  );
}
