import { Fragment, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation } from 'react-router';
import { useGenieChat } from '@databricks/appkit-ui/react';
import type { GenieMessageItem } from '@databricks/appkit-ui/react';
import { useAppConfig } from '@/lib/appConfig';
import { pageForPath } from '@/pages';
import { SUGGESTED } from './questions';

const NOT_CONNECTED = "Genie isn't connected yet.";
const FAILED = "I couldn't reach the assistant just now. Try again in a moment.";
const NO_ANSWER = "Genie couldn't answer that. Try rephrasing, or name an owner, product or application.";
// Mirrors appkit-ui's TERMINAL_STATUSES: 0.84 declares it in its types but doesn't export it at runtime.
const TERMINAL_STATUSES: ReadonlySet<string> = new Set(['COMPLETED', 'FAILED', 'CANCELLED', 'QUERY_RESULT_EXPIRED']);
const MAX_ROWS = 10;

interface ResultTable {
  columns: string[];
  rows: (string | null)[][];
  total: number;
}

interface Bubble {
  id: string;
  role: 'u' | 'a';
  text: string;
  thinking?: boolean;
  table?: ResultTable | 'loading';
  sql?: string;
}

function Sparkle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c.6 4.9 3.3 8.4 10 10-6.7 1.6-9.4 5.1-10 10-.6-4.9-3.3-8.4-10-10 6.7-1.6 9.4-5.1 10-10z" />
    </svg>
  );
}

/** Genie's answer for one assistant message: its text, plus the query result and SQL when it ran one. */
function toBubble(m: GenieMessageItem, i: number): Bubble {
  const id = m.id || `pending-${i}`;
  if (m.role === 'user') return { id, role: 'u', text: m.content };
  if (m.error) return { id, role: 'a', text: FAILED };

  const texts = m.attachments.map((a) => a.text?.content).filter((t): t is string => Boolean(t));
  const q = m.attachments.find((a) => a.query);
  const text = texts.join('\n\n') || q?.query?.description || '';
  if (!text && !TERMINAL_STATUSES.has(m.status)) {
    return { id, role: 'a', text: m.status === 'EXECUTING_QUERY' ? 'Running the query…' : 'Thinking…', thinking: true };
  }

  const bubble: Bubble = { id, role: 'a', text: text || NO_ANSWER, sql: q?.query?.query };
  if (q?.attachmentId) {
    const result = m.queryResults.get(q.attachmentId);
    if (result) {
      const rows = result.result?.data_array ?? [];
      bubble.table = {
        columns: result.manifest?.schema?.columns?.map((c) => c.name) ?? [],
        rows: rows.slice(0, MAX_ROWS),
        total: rows.length,
      };
    } else if (!TERMINAL_STATUSES.has(m.status) || q.query?.statementId) {
      bubble.table = 'loading';
    }
  }
  return bubble;
}

/** Genie answers use **bold** markdown; render that and leave everything else as text. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/(\*\*[^*]+\*\*)/g)
        .map((part, i) =>
          part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
            <b key={i}>{part.slice(2, -2)}</b>
          ) : (
            <Fragment key={i}>{part}</Fragment>
          )
        )}
    </>
  );
}

const cell = (v: string | null) =>
  v === null ? '–' : /^-?\d+(\.\d+)?$/.test(v) ? Number(v).toLocaleString('en', { maximumFractionDigits: 2 }) : v;

function Answer({ b }: { b: Bubble }) {
  return (
    <>
      <RichText text={b.text} />
      {b.table === 'loading' && <span className="gnote">Loading results…</span>}
      {b.table && b.table !== 'loading' && b.table.columns.length > 0 && (
        <>
          <div className="gtw">
            <table>
              <tbody>
                <tr>
                  {b.table.columns.map((c) => (
                    <th key={c}>{c.replace(/_/g, ' ')}</th>
                  ))}
                </tr>
                {b.table.rows.map((r, ri) => (
                  <tr key={ri}>
                    {r.map((v, ci) => (
                      <td key={ci}>{cell(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {b.table.total > b.table.rows.length && (
            <span className="gnote">{`Showing ${b.table.rows.length} of ${b.table.total} rows.`}</span>
          )}
        </>
      )}
      {b.sql && (
        <details>
          <summary>Show SQL</summary>
          <pre>{b.sql}</pre>
        </details>
      )}
      {(b.sql || b.table) && <span className="gnote">AI-generated from Unity Catalog data. Check before acting.</span>}
    </>
  );
}

/** The prototype's floating "Ask Genie" button and slide-in panel, backed by the genie() plugin. */
export function GenieAssistant() {
  const page = pageForPath(useLocation().pathname);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const config = useAppConfig();
  const connected = config ? config.genie : null;
  const [local, setLocal] = useState<Bubble[]>([]);
  const { messages, status, error, sendMessage, reset } = useGenieChat({ alias: 'default', persistInUrl: false });
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // As in the prototype, Genie's predicted follow-ups replace the page's suggested questions.
  const lastAnswer = connected ? [...messages].reverse().find((m) => m.role === 'assistant') : undefined;
  const followups = (lastAnswer?.attachments ?? []).flatMap((a) => a.suggestedQuestions ?? []).slice(0, 3);
  const suggestions = followups.length ? followups : SUGGESTED[page.key];

  const last = bubbles.at(-1);
  const scrollKey = `${bubbles.length}|${last?.text}|${last?.table === 'loading' ? 'l' : last?.table ? 't' : ''}`;
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 1e9;
  }, [scrollKey]);

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
          <div className="gm a">{`I can see the ${page.label} page. Ask me anything about it.`}</div>
          {bubbles.map((b) => (
            <div key={b.id} className={`gm ${b.role}${b.thinking ? ' t' : ''}`}>
              {b.role === 'a' && !b.thinking ? <Answer b={b} /> : b.text}
            </div>
          ))}
        </div>
        <div className="gsug" style={suggestions.length ? undefined : { display: 'none' }}>
          {suggestions.length > 0 && <div className="gl">Suggested for this page</div>}
          {suggestions.map((q) => (
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
          <button type="submit" disabled={busy}>
            Send
          </button>
        </form>
      </aside>
    </>
  );
}
