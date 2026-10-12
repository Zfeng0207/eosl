import { useEffect, useState } from 'react';

/** What Genie is doing, by its message status (polled while the answer is prepared). */
const STAGES: Readonly<Record<string, string>> = {
  SUBMITTED: 'Reading your question',
  FILTERING_CONTEXT: 'Finding the right data',
  FETCHING_METADATA: 'Finding the right data',
  ASKING_AI: 'Working out the query',
  PENDING_WAREHOUSE: 'Waking up the SQL warehouse',
  EXECUTING_QUERY: 'Running the query on Unity Catalog',
};

const SLOW_AFTER_S = 20;

/** Animated "thinking" bubble: live stage, bouncing dots and elapsed time, so long questions don't look stuck. */
export function Thinking({ status }: { status: string }) {
  const [started] = useState(() => Date.now());
  // The chat hook starts every question at ASKING_AI before Genie reports anything, so the first
  // status is shown as "Reading your question" until Genie moves to a real stage.
  const [initialStatus] = useState(status);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
  }, [started]);

  const stage = status === initialStatus && seconds < 3 ? 'Reading your question' : (STAGES[status] ?? 'Thinking');
  return (
    <div className="gthink" role="status" aria-label={`${stage}…`}>
      <span className="gthink-row">
        <span className="gthink-spark" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2c.6 4.9 3.3 8.4 10 10-6.7 1.6-9.4 5.1-10 10-.6-4.9-3.3-8.4-10-10 6.7-1.6 9.4-5.1 10-10z" />
          </svg>
        </span>
        <span className="gthink-stage" key={stage}>
          {stage}
        </span>
        <span className="gthink-dots" aria-hidden="true">
          <i></i>
          <i></i>
          <i></i>
        </span>
        {seconds >= 3 && <span className="gthink-time">{`${seconds}s`}</span>}
      </span>
      <span className="gthink-bar" aria-hidden="true"></span>
      {seconds >= SLOW_AFTER_S && (
        <span className="gnote">Bigger questions can take up to a minute. Still working on it.</span>
      )}
    </div>
  );
}
