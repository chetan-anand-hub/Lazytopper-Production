/**
 * Path: src/pages/WeeklyWrappedPage.tsx
 *
 * WeeklyWrappedPage
 *
 * A standalone page that displays the Weekly Wrapped story. It aggregates
 * the learner's practice attempts over the past week and passes the resulting
 * summary into the carousel component. If there are no attempts during the
 * interval, the page renders a friendly message encouraging the student to practise.
 * Share workflow captures the carousel as an image and tries native share,
 * clipboard, or download fallbacks, keeping the UI unchanged.
 */
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getAttempts } from '../services/practiceInsights';
import { generateWeeklyWrapped } from '../services/weeklyWrappedGenerator';
import { WeeklyWrappedCarousel } from '../components/WeeklyWrappedCarousel';
import { shareNodeAsImage } from '../utils/shareImage';

export default function WeeklyWrappedPage() {
  const navigate = useNavigate();
  const captureRef = useRef<HTMLDivElement | null>(null);

  // Compute the date range for the past 7 days
  const [end] = useState(() => Date.now());
  const start = end - 7 * 24 * 60 * 60 * 1000;
  const isSunday = useMemo(() => new Date(end).getDay() === 0, [end]);
  const [showEarly, setShowEarly] = useState(false);

  // Load all attempts in this interval
  const attempts = useMemo(() => getAttempts({ start, end }), [start, end]);
  const summary = useMemo(
    () => generateWeeklyWrapped(attempts, { start, end }),
    [attempts, start, end]
  );

  const handleClose = () => navigate('/dashboard');

  const handleShare = async () => {
    const res = await shareNodeAsImage(captureRef.current, {
      fileName: 'lazytopper-weekly-wrapped.png',
      title: 'LazyTopper Weekly Wrapped',
      text: `My LazyTopper Weekly Wrapped - ${summary.consistencyPercentile}% consistency, power hour ${summary.powerHourLabel}`,
    });

    if (!res.ok) {
      console.error('Weekly Wrapped share failed:', res.error);
      window.alert('Could not share this right now. Please try again.');
    }
  };

  return (
    <div className="lt-page">
      <h2 className="title">Weekly Wrapped</h2>

      {summary.totalAttempts === 0 ? (
        <p>
          No study data for the past week yet. Practise some questions to see your
          progress!
        </p>
      ) : !isSunday && !showEarly ? (
        <div className="card">
          <h3>Weekly Recap unlocks on Sunday</h3>
          <p style={{ marginTop: 8, opacity: 0.85 }}>
            Keep going. Your complete wrapped story unlocks on Sunday for a full weekly snapshot.
          </p>
          <button className="pill-btn" style={{ marginTop: 10 }} onClick={() => setShowEarly(true)}>
            Preview now
          </button>
        </div>
      ) : (
        <div>
          <div
            style={{
              marginBottom: 12,
              border: "1px solid rgba(15,23,42,0.12)",
              borderRadius: 12,
              padding: 12,
              background: "rgba(255,255,255,0.86)",
            }}
          >
            <div style={{ fontWeight: 800 }}>This week summary</div>
            <div style={{ marginTop: 4, opacity: 0.85, fontSize: 14 }}>
              Topics conquered: {summary.topicsConquered} | Power hour: {summary.powerHourLabel} | Consistency: {summary.consistencyPercentile}%
            </div>
          </div>
          <div id="weekly-wrapped-capture" ref={captureRef}>
            <WeeklyWrappedCarousel
              summary={summary}
              onClose={handleClose}
              onShare={handleShare}
            />
          </div>
        </div>
      )}
    </div>
  );
}
