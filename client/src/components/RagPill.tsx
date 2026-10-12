import { ragLabel } from '@/data/rag';
import type { Rag } from '@/data/types';

/** `upper` matches the Update Center's "RED → GREEN" pills; elsewhere the label is "Red"/"Unknown". */
export function RagPill({ rag, upper = false }: { rag: Rag; upper?: boolean }) {
  return <span className={`pill ${rag}`}>{upper ? rag.toUpperCase() : ragLabel(rag)}</span>;
}
