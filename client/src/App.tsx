import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import { Shell } from '@/components/Shell';
import { DEFAULT_PATH } from '@/pages';

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
      { path: '/lineage', element: <div className="ttl">Lineage Explorer</div> },
      { path: '/impact', element: <div className="ttl">Impact Analysis: what happens if we do nothing?</div> },
      { path: '/update-center', element: <div className="ttl">EOSL Update Center</div> },
      { path: '*', element: <Navigate to={DEFAULT_PATH} replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
