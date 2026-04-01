import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAttempts } from '../services/practiceInsights';
import { generateWeeklyWrapped } from '../services/weeklyWrappedGenerator';

/**
 * WeeklyWrappedWidget
 *
 * A small dashboard card that summarises the learner's weekly study
 * activity and provides a quick link to view the full Weekly Wrapped
 * carousel.  It computes the current week's start and end times
 * (last 7 days) and aggregates practice attempts via the
 * practiceInsights service.  If there are no attempts for the
 * interval, the widget simply returns null to avoid rendering an
 * empty card.  Consumers can optionally pass a CSS className for
 * custom styling.
 */
export default function WeeklyWrappedWidget({ className }: { className?: string }) {
  const navigate = useNavigate();

  // Determine the current interval: last 7 days (inclusive of today).
  const end = Date.now();
  const start = end - 7 * 24 * 60 * 60 * 1000;

  // Retrieve attempts once for this interval.
  const attempts = useMemo(() => getAttempts({ start, end }), [start, end]);
  // Compute the summary using the weekly wrapped generator.
  const summary = useMemo(() => generateWeeklyWrapped(attempts, { start, end }), [attempts, start, end]);

  // Don't render anything if there are no attempts in this interval.
  if (summary.totalAttempts === 0) return null;

  const accuracyPct = (summary.accuracy * 100).toFixed(1);

  return (
    <div className={`card ${className ?? ''}`.trim()}>
      <h3>📈 Weekly Wrapped</h3>
      <p>
        You attempted <strong>{summary.totalAttempts}</strong> questions in the past week with an
        accuracy of <strong>{accuracyPct}%</strong>.
      </p>
      <button className="cta-btn" onClick={() => navigate('/weekly-wrapped')}>
        View Your Story
      </button>
    </div>
  );
}