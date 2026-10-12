import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { PAGES } from '@/pages';

/** Green header, nav tabs and the `#pg` page container from the prototype. */
export function Shell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // The prototype scrolls to top on page change; in-page re-renders keep the scroll position.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <header>
        <div className="hd">
          <div className="top">
            <div>
              <h1>EOSL Decision Intelligence v3</h1>
              <span className="sub">
                Lifecycle risk, ownership and action across OS, database, software and hardware estates
              </span>
            </div>
          </div>
          <nav>
            {PAGES.map((p) => (
              <button
                key={p.key}
                type="button"
                className={p.path === pathname ? 'on' : ''}
                onClick={() => void navigate(p.path)}
              >
                {p.label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <div className="app" id="pg">
        <Outlet />
      </div>
    </>
  );
}
