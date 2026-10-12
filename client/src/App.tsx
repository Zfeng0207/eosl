import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import { Shell } from '@/components/Shell';
import { MockEoslDataService } from '@/data/mock/MockEoslDataService';
import { ImpactPage } from '@/pages/ImpactPage';
import { LineagePage } from '@/pages/LineagePage';
import { DEFAULT_PATH } from '@/pages';
import { EoslProvider } from '@/state/EoslContext';

// MOCK data source. Swap for an analytics()-backed EoslDataService to use real data.
const dataService = new MockEoslDataService();

const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { index: true, element: <Navigate to={DEFAULT_PATH} replace /> },
      { path: '/overview', element: <div className="ttl">Landscape Overview</div> },
      { path: '/hosts-with-app', element: <div className="ttl">Host with Application</div> },
      { path: '/hosts-without-app', element: <div className="ttl">Host without Application</div> },
      { path: '/hosts-without-eosl', element: <div className="ttl">Host without EoSL</div> },
      { path: '/database-eosl', element: <div className="ttl">Database EoSL Analysis</div> },
      { path: '/lineage', element: <LineagePage /> },
      { path: '/impact', element: <ImpactPage /> },
      { path: '/update-center', element: <div className="ttl">EOSL Update Center</div> },
      { path: '*', element: <Navigate to={DEFAULT_PATH} replace /> },
    ],
  },
]);

export default function App() {
  return (
    <EoslProvider service={dataService}>
      <RouterProvider router={router} />
    </EoslProvider>
  );
}
