import {
  ResourceStatusIndicator,
  ResourceStatusProvider,
} from '@databricks/appkit-ui/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/m-plus-rounded-1c/400.css';
import '@fontsource/m-plus-rounded-1c/500.css';
import '@fontsource/m-plus-rounded-1c/700.css';
import '@fontsource/m-plus-rounded-1c/800.css';
// Prototype stylesheet only: appkit-ui's Tailwind preflight is intentionally not loaded so it
// can't override the prototype's styles. TODO: restyle the resource-status toast when analytics() is added.
import './styles/eosl.css';
import App from './App.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {/*
       * Surfaces resource readiness (e.g. SQL warehouse cold-starts) as a
       * single sonner toast across the whole tree. Both are no-ops when
       * nothing's pending; remove them to render the aggregate yourself
       * via useResourceStatus(). Apps that already mount their own
       * <Toaster /> can swap the indicator for useResourceStatusToaster().
       */}
      <ResourceStatusProvider>
        <ResourceStatusIndicator />
        <App />
      </ResourceStatusProvider>
    </ErrorBoundary>
  </StrictMode>
);
