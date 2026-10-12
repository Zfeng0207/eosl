import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation } from 'react-router';
import { useGenieChat } from '@databricks/appkit-ui/react';
import type { GenieMessageItem } from '@databricks/appkit-ui/react';
import { pageForPath } from '@/pages';
import { SUGGESTED } from './questions';

const NOT_CONNECTED = "Genie isn't connected yet.";
const FAILED = "I couldn't reach the assistant just now. Try again in a moment.";
// Mirrors appkit-ui's TERMINAL_STATUSES: 0.84 declares it in its types but doesn't export it at runtime.
const TERMINAL_STATUSES: ReadonlySet<string> = new Set(['COMPLETED', 'FAILED']);

interface Bubble {
  id: string;
  role: 'u' | 'a';
  text: string;
  thinking?: boolean;
}

function Sparkle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c.6 4.9 3.3 8.4 10 10-6.7 1.6-9.4 5.1-10 10-.6-4.9-3.3-8.4-10-10 6.7-1.6 9.4-5.1 10-10z" />
    </svg>
  );
}

/** Text to show for a Genie answer: its message, else any text attachment. */
function answerText(m: GenieMessageItem): string {
  if (m.error) return FAILED;
  const text = m.content || m.attachments.map((a) => a.text?.content).find(Boolean);
  if (text) return text;
  return m.attachments.some((a) => a.query)
    ? 'Genie answered with a query result. Open the Genie space to see the table.'
    : '';
}

function toBubble(m: GenieMessageItem, i: number): Bubble {
  const id = m.id || `pending-${i}`;
  if (m.role === 'user') return { id, role: 'u', text: m.content };
  const text = answerText(m);
  if (!text && !TERMINAL_STATUSES.has(m.status)) return { id, role: 'a', text: 'Thinking…', thinking: true };
  return { id, role: 'a', text: text || FAILED };
}

/** The prototype's floating "Ask Genie" button and slide-in panel, backed by the genie() plugin. */
export function GenieAssistant() {
  const page = pageForPath(useLocation().pathname);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [connected, setConnected] = useState<boolean | null>(null);
  const [local, setLocal] = useState<Bubble[]>([]);
  const { messages, status, error, sendMessage, reset } = useGenieChat({ alias: 'default', persistInUrl: false });
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/eosl/config')
      .then((r) => r.json() as Promise<{ genie?: boolean }>)
      .then((c) => setConnected(Boolean(c.genie)))
      .catch(() => setConnected(false));
  }, []);

  // New page, new conversation (as in the prototype).
  const [pageKey, setPageKey] = useState(page.key);
  if (pageKey !== page.key) {
    setPageKey(page.key);
    setLocal([]);
  }
  useEffect(() => {
    reset();
  }, [page.key, reset]);

  const bubbles: Bubble[] = connected ? messages.map(toBubble) : local;
  if (connected && status === 'error' && error && messages.at(-1)?.role !== 'assistant') {
    bubbles.push({ id: 'error', role: 'a', text: FAILED });
  }
  const busy = connected === true && status === 'streaming';

  const lastText = bubbles.at(-1)?.text;
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 1e9;
  }, [bubbles.length, lastText]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, [open]);

  function ask(q: string) {
    const text = q.trim();
    if (!text || busy) return;
    setQuery('');
    if (connected) sendMessage(text);
    else
      setLocal((cur) => [
        ...cur,
        { id: `u${cur.length}`, role: 'u', text },
        { id: `a${cur.length}`, role: 'a', text: NOT_CONNECTED },
      ]);
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(query);
  };

  return (
    <>
      <button
        type="button"
        className="gfab"
        style={open ? { display: 'none' } : undefined}
        onClick={() => setOpen(true)}
      >
        <Sparkle />
        Ask Genie
      </button>
      <aside className={`gpan${open ? ' open' : ''}`} aria-label="Genie assistant" aria-hidden={!open}>
        <div className="ghd">
          <span className="gi">
            <Sparkle />
          </span>
          <div>
            <b>Genie</b>
            <small>{`Context: ${page.label}`}</small>
          </div>
          <button className="gx" type="button" aria-label="Close" onClick={() => setOpen(false)}>
            ×
          </button>
        </div>
        <div className="gbody" ref={bodyRef} aria-live="polite">
          <div className="gm a">
            {`I can see the ${page.label} page. Ask me anything about it, or pick a suggested question below.`}
          </div>
          {bubbles.map((b) => (
            <div key={b.id} className={`gm ${b.role}${b.thinking ? ' t' : ''}`}>
              {b.text}
            </div>
          ))}
        </div>
        <div className="gsug">
          <div className="gl">Suggested for this page</div>
          {SUGGESTED[page.key].map((q) => (
            <button key={q} type="button" onClick={() => ask(q)}>
              {q}
            </button>
          ))}
        </div>
        <form className="gin" onSubmit={onSubmit}>
          <input
            ref={inputRef}
            placeholder="Ask about this page…"
            autoComplete="off"
            aria-label="Ask Genie"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit">Send</button>
        </form>
      </aside>
    </>
  );
}
