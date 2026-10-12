import { ControlsBar } from '@/components/ControlsBar';
import { KpiCards } from '@/components/KpiCards';
import { ImpactSummary } from '@/components/lineage/ImpactSummary';
import { LineageColumns } from '@/components/lineage/LineageColumns';
import { LineageTrace } from '@/components/lineage/LineageTrace';
import { StatusMatrix } from '@/components/lineage/StatusMatrix';

export function LineagePage() {
  return (
    <>
      <div className="ttl">Lineage Explorer</div>
      <ControlsBar />
      <KpiCards />
      <StatusMatrix />
      <LineageTrace />
      <LineageColumns />
      <ImpactSummary />
    </>
  );
}
