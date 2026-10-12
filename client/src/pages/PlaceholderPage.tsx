import { PLACEHOLDERS } from './placeholders.config';
import type { PlaceholderKey } from './placeholders.config';

/** A view reserved for an embedded Databricks AI/BI dashboard. */
export function PlaceholderPage({ page }: { page: PlaceholderKey }) {
  const { title, embedUrl } = PLACEHOLDERS[page];
  return (
    <>
      <div className="ttl">{title}</div>
      {embedUrl ? (
        <iframe className="phf" src={embedUrl} title={title} />
      ) : (
        <div className="card">
          <h2>Databricks AI/BI dashboard</h2>
          <div className="sub">This view will be delivered as an embedded Databricks AI/BI dashboard.</div>
          <div className="ph">Reserved for the {title} dashboard</div>
        </div>
      )}
    </>
  );
}
