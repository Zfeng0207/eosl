import { Fragment, useEffect, useMemo, useRef, useState } from 'react';

interface Token {
  text: string;
  bold: boolean;
}

/** Split Genie text into word/space tokens, keeping **bold** spans intact across the reveal. */
function tokenize(text: string): Token[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .flatMap((part) => {
      const bold = part.startsWith('**') && part.endsWith('**') && part.length > 4;
      return (bold ? part.slice(2, -2) : part).split(/(\s+)/).map((t) => ({ text: t, bold }));
    })
    .filter((t) => t.text);
}

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
// Pace: about 35ms per word, but never longer than ~3s for the whole answer.
const MAX_STEP_MS = 35;
const MAX_TOTAL_MS = 3000;

/**
 * Reveals text word by word. Genie returns a finished answer (it doesn't stream), so this is a
 * presentation effect; `animate=false` (or reduced motion) shows the text at once.
 */
export function TypedText({ text, animate, onDone }: { text: string; animate: boolean; onDone?: () => void }) {
  const tokens = useMemo(() => tokenize(text), [text]);
  const instant = !animate || prefersReducedMotion();
  const [shown, setShown] = useState(instant ? tokens.length : 0);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);

  useEffect(() => {
    if (instant) return;
    const words = tokens.filter((t) => t.text.trim()).length || 1;
    const step = Math.max(8, Math.min(MAX_STEP_MS, MAX_TOTAL_MS / words));
    const t = setInterval(() => {
      setShown((n) => {
        // Advance to the end of the next word (skip whitespace tokens).
        let next = n + 1;
        while (next < tokens.length && !tokens[next - 1].text.trim()) next++;
        return Math.min(next, tokens.length);
      });
    }, step);
    return () => clearInterval(t);
  }, [instant, tokens]);

  const complete = instant || shown >= tokens.length;
  useEffect(() => {
    // Keep the newest words in view while typing, unless the reader has scrolled up.
    const body = ref.current?.closest('.gbody');
    if (body && body.scrollHeight - body.scrollTop - body.clientHeight < 120) body.scrollTop = body.scrollHeight;
    if (complete && !done.current) {
      done.current = true;
      onDone?.();
    }
  }, [shown, complete, onDone]);

  const visible = complete ? tokens : tokens.slice(0, shown);
  return (
    <span ref={ref} className={complete ? undefined : 'gtyping'}>
      {visible.map((t, i) => (t.bold ? <b key={i}>{t.text}</b> : <Fragment key={i}>{t.text}</Fragment>))}
    </span>
  );
}
