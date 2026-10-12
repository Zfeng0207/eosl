import { useAppConfig } from '@/lib/appConfig';
import { PLACEHOLDERS } from './placeholders.config';
import type { PlaceholderKey } from './placeholders.config';

/** A view delivered as an embedded Databricks AI/BI dashboard, or its reserved slot until one is configured. */
export function PlaceholderPage({ page }: { page: PlaceholderKey }) {
  const { title, embedHeight } = PLACEHOLDERS[page];
  const embedUrl = useAppConfig()?.embeds[page];
  return (
    <>
      <div className="ttl">{title}</div>
      {embedUrl ? (
        <iframe
          className="phf"
          src={embedUrl}
          title={title}
          style={embedHeight ? { height: embedHeight } : undefined}
        />
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
