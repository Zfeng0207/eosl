import type { Rag } from '@/data/types';
import { STATUS } from './status';

export function StatusIcon({ rag }: { rag: Rag }) {
  return (
    <i className={`ow-i ${rag}`} aria-hidden="true">
      {STATUS[rag][2]}
    </i>
  );
}

export function StatusTag({ rag }: { rag: Rag }) {
  return (
    <span className="ow-tag">
      <StatusIcon rag={rag} />
      {STATUS[rag][0]}
    </span>
  );
}
