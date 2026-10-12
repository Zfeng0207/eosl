import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import { Shell } from '@/components/Shell';
import { MockEoslDataService } from '@/data/mock/MockEoslDataService';
import { ImpactPage } from '@/pages/ImpactPage';
import { LineagePage } from '@/pages/LineagePage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { UpdateCenterPage } from '@/pages/UpdateCenterPage';
import { DEFAULT_PATH } from '@/pages';
import { EoslProvider } from '@/state/EoslContext';

// MOCK data source. Swap for an analytics()-backed EoslDataService to use real data.
const dataService = new MockEoslDataService();

const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { index: true, element: <Navigate to={DEFAULT_PATH} replace /> },
      { path: '/overview', element: <PlaceholderPage page="overview" /> },
      { path: '/hosts-with-app', element: <PlaceholderPage page="hosts-with-app" /> },
      { path: '/hosts-without-app', element: <PlaceholderPage page="hosts-without-app" /> },
      { path: '/hosts-without-eosl', element: <PlaceholderPage page="hosts-without-eosl" /> },
      { path: '/database-eosl', element: <PlaceholderPage page="database-eosl" /> },
      { path: '/lineage', element: <LineagePage /> },
      { path: '/impact', element: <ImpactPage /> },
      { path: '/update-center', element: <UpdateCenterPage /> },
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
