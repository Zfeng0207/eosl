import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { EoslDataService } from '@/data/EoslDataService';
import { worstOf } from '@/data/rag';
import type { Overrides } from '@/data/rag';
import type { EoslDataset, LineageKey, LineageSelection, Rag, StatusOption, WorkflowStep } from '@/data/types';

import type { Horizon, TypeFilter } from './filters';

export interface StatusUpdate {
  product: string;
  status: StatusOption;
  previous: Rag;
  next: Rag;
}

interface EoslState {
  data: EoslDataset;
  type: TypeFilter;
  hz: Horizon;
  ragFocus: Rag | null;
  sel: LineageSelection;
  overrides: Overrides;
  impSel: string;
  wf: number;
  wlog: readonly WorkflowStep[];
  lastUpdate: StatusUpdate | null;
  setType: (t: TypeFilter) => void;
  setHz: (m: Horizon) => void;
  toggleRagFocus: (g: Rag) => void;
  toggleSel: (k: LineageKey, v: string) => void;
  resetLineage: () => void;
  setImpSel: (name: string) => void;
  submitStatus: (product: string, status: StatusOption) => Promise<void>;
  advanceWorkflow: () => void;
  resetWorkflow: () => void;
}

const EoslContext = createContext<EoslState | null>(null);

// The prototype opens the Lineage Explorer with this product selected.
const INITIAL_SELECTION: LineageSelection = { p: 'Windows 11 23H2' };

/** Loads the dataset once, then holds all cross-page state (filters, overrides, workflow). */
export function EoslProvider({ service, children }: { service: EoslDataService; children: ReactNode }) {
  const [data, setData] = useState<EoslDataset | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    service.load().then(
      (d) => live && setData(d),
      (e: unknown) => live && setError(e instanceof Error ? e.message : String(e))
    );
    return () => {
      live = false;
    };
  }, [service]);

  if (error) return <div className="app"><p className="sub">{`Couldn't load EOSL data: ${error}`}</p></div>;
  if (!data) return null;
  return (
    <LoadedProvider service={service} data={data}>
      {children}
    </LoadedProvider>
  );
}

function LoadedProvider({ service, data, children }: { service: EoslDataService; data: EoslDataset; children: ReactNode }) {
  const [type, setType] = useState<TypeFilter>('All');
  const [hz, setHz] = useState<Horizon>(0);
  const [ragFocus, setRagFocus] = useState<Rag | null>(null);
  const [sel, setSel] = useState<LineageSelection>(INITIAL_SELECTION);
  const [overrides, setOverrides] = useState<Overrides>({});
  const [impSel, setImpSel] = useState(data.impact.defaultScenario);
  const [wf, setWf] = useState(-1);
  const [wlog, setWlog] = useState<readonly WorkflowStep[]>([]);
  const [lastUpdate, setLastUpdate] = useState<StatusUpdate | null>(null);

  const toggleRagFocus = useCallback((g: Rag) => setRagFocus((cur) => (cur === g ? null : g)), []);
  const toggleSel = useCallback(
    (k: LineageKey, v: string) => setSel((cur) => ({ ...cur, [k]: cur[k] === v ? undefined : v })),
    []
  );
  const resetLineage = useCallback(() => {
    setSel({});
    setRagFocus(null);
  }, []);

  const submitStatus = useCallback(
    async (product: string, status: StatusOption) => {
      const previous = worstOf(
        data.records.filter((r) => r.p === product),
        hz,
        overrides
      );
      const next = await service.updateStatus(product, status);
      setOverrides((cur) => ({ ...cur, [product]: next }));
      setLastUpdate({ product, status, previous, next });
    },
    [data.records, hz, overrides, service]
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
      ragFocus,
      sel,
      overrides,
      impSel,
      wf,
      wlog,
      lastUpdate,
      setType,
      setHz,
      toggleRagFocus,
      toggleSel,
      resetLineage,
      setImpSel,
      submitStatus,
      advanceWorkflow,
      resetWorkflow,
    }),
    [data, type, hz, ragFocus, sel, overrides, impSel, wf, wlog, lastUpdate, toggleRagFocus, toggleSel, resetLineage, submitStatus, advanceWorkflow, resetWorkflow]
  );

  return <EoslContext.Provider value={value}>{children}</EoslContext.Provider>;
}

export function useEosl(): EoslState {
  const ctx = useContext(EoslContext);
  if (!ctx) throw new Error('useEosl must be used inside <EoslProvider>');
  return ctx;
}
