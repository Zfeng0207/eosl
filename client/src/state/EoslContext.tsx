import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { EoslDataSource } from '@/data/EoslDataService';
import { worstOf } from '@/data/rag';
import type { Overrides } from '@/data/rag';
import type { EoslDataset, LineageKey, Rag, StatusOption, WorkflowStep } from '@/data/types';
import type { Horizon, TypeFilter } from './filters';

export interface StatusUpdate {
  product: string;
  status: StatusOption;
  previous: Rag;
  next: Rag;
}

/** A map node the user clicked to trace: everything not connected to it is dimmed. */
export interface Trace {
  k: LineageKey;
  v: string;
}

interface EoslState {
  data: EoslDataset;
  type: TypeFilter;
  hz: Horizon;
  overrides: Overrides;
  /** Lineage Explorer (owner view): statuses in focus, chosen owner, traced node, full screen, table open. */
  focus: ReadonlySet<Rag>;
  owner: string | null;
  trace: Trace | null;
  expanded: boolean;
  tableOpen: boolean;
  /** True when the lineage map should animate in for `owner` (it only animates when the owner changes). */
  shouldAnimateOwner: (owner: string) => boolean;
  impSel: string;
  wf: number;
  wlog: readonly WorkflowStep[];
  lastUpdate: StatusUpdate | null;
  setType: (t: TypeFilter) => void;
  setHz: (m: Horizon) => void;
  toggleFocus: (g: Rag) => void;
  setOwner: (owner: string) => void;
  toggleTrace: (t: Trace) => void;
  clearTrace: () => void;
  setExpanded: (on: boolean) => void;
  setTableOpen: (open: boolean) => void;
  setImpSel: (name: string) => void;
  submitStatus: (product: string, status: StatusOption) => Promise<void>;
  advanceWorkflow: () => void;
  resetWorkflow: () => void;
}

const EoslContext = createContext<EoslState | null>(null);

// The Leadership prototype opens the Lineage Explorer focused on "Act now".
const INITIAL_FOCUS: ReadonlySet<Rag> = new Set<Rag>(['red']);

/**
 * Loads the dataset from the data source, then holds all cross-page state (filters, overrides,
 * workflow). Loading and error states render in the page area, inside the app shell.
 */
export function EoslProvider({ source, children }: { source: EoslDataSource; children: ReactNode }) {
  const { data, error, warehouseState } = source.useDataset();

  if (error)
    return <p className="sub" style={{ marginTop: 32 }}>{`Couldn't load EOSL data from ${source.label}: ${error}`}</p>;
  if (!data)
    return (
      <p className="sub" style={{ marginTop: 32 }} role="status">
        {warehouseState
          ? `Starting the SQL warehouse (${warehouseState.toLowerCase()})… this can take a minute.`
          : `Loading EOSL data from ${source.label}…`}
      </p>
    );
  return (
    <LoadedProvider source={source} data={data}>
      {children}
    </LoadedProvider>
  );
}

function LoadedProvider({
  source,
  data,
  children,
}: {
  source: EoslDataSource;
  data: EoslDataset;
  children: ReactNode;
}) {
  const [type, setTypeState] = useState<TypeFilter>('All');
  const [hz, setHz] = useState<Horizon>(0);
  const [focus, setFocus] = useState<ReadonlySet<Rag>>(INITIAL_FOCUS);
  const [owner, setOwnerState] = useState<string | null>(null);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const lastAnimatedOwner = useRef<string | null>(null);
  const [overrides, setOverrides] = useState<Overrides>({});
  const [impSel, setImpSel] = useState(data.impact.defaultScenario);
  const [wf, setWf] = useState(-1);
  const [wlog, setWlog] = useState<readonly WorkflowStep[]>([]);
  const [lastUpdate, setLastUpdate] = useState<StatusUpdate | null>(null);

  // As in the prototype, changing the type, focus or owner clears the trace; changing the horizon doesn't.
  const setType = useCallback((t: TypeFilter) => {
    setTypeState(t);
    setTrace(null);
  }, []);
  const toggleFocus = useCallback((g: Rag) => {
    setFocus((cur) => {
      const next = new Set(cur);
      if (!next.delete(g)) next.add(g);
      return next;
    });
    setTrace(null);
  }, []);
  const setOwner = useCallback((o: string) => {
    setOwnerState(o);
    setTrace(null);
  }, []);
  const toggleTrace = useCallback(
    (t: Trace) => setTrace((cur) => (cur && cur.k === t.k && cur.v === t.v ? null : t)),
    []
  );
  const clearTrace = useCallback(() => setTrace(null), []);
  const shouldAnimateOwner = useCallback((o: string) => {
    const changed = lastAnimatedOwner.current !== o;
    lastAnimatedOwner.current = o;
    return changed;
  }, []);

  const submitStatus = useCallback(
    async (product: string, status: StatusOption) => {
      const previous = worstOf(
        data.records.filter((r) => r.p === product),
        hz,
        overrides
      );
      const next = await source.updateStatus(product, status);
      setOverrides((cur) => ({ ...cur, [product]: next }));
      setLastUpdate({ product, status, previous, next });
    },
    [data.records, hz, overrides, source]
  );

  const advanceWorkflow = useCallback(() => {
    if (wf >= data.workflow.length - 1) return;
    const step = data.workflow[wf + 1];
    setWf(wf + 1);
    setWlog((cur) => [step, ...cur]);
  }, [wf, data.workflow]);

  const resetWorkflow = useCallback(() => {
    setWf(-1);
    setWlog([]);
  }, []);

  const value = useMemo<EoslState>(
    () => ({
      data,
      type,
      hz,
      overrides,
      focus,
      owner,
      trace,
      expanded,
      tableOpen,
      shouldAnimateOwner,
      impSel,
      wf,
      wlog,
      lastUpdate,
      setType,
      setHz,
      toggleFocus,
      setOwner,
      toggleTrace,
      clearTrace,
      setExpanded,
      setTableOpen,
      setImpSel,
      submitStatus,
      advanceWorkflow,
      resetWorkflow,
    }),
    [
      data,
      type,
      hz,
      overrides,
      focus,
      owner,
      trace,
      expanded,
      tableOpen,
      impSel,
      wf,
      wlog,
      lastUpdate,
      setType,
      toggleFocus,
      setOwner,
      toggleTrace,
      clearTrace,
      shouldAnimateOwner,
      submitStatus,
      advanceWorkflow,
      resetWorkflow,
    ]
  );

  return <EoslContext.Provider value={value}>{children}</EoslContext.Provider>;
}

export function useEosl(): EoslState {
  const ctx = useContext(EoslContext);
  if (!ctx) throw new Error('useEosl must be used inside <EoslProvider>');
  return ctx;
}
