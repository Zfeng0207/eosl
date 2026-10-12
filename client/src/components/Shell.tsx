import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { GenieAssistant } from '@/components/genie/GenieAssistant';
import { PAGES } from '@/pages';

/** Leadership layout: green sidebar with the bp mark and page nav, and the `#pg` page container. */
export function Shell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const navRef = useRef<HTMLElement>(null);

  // The prototype scrolls to top on page change; in-page re-renders keep the scroll position.
  // Below 900px the sidebar becomes a top bar whose nav scrolls sideways, so keep the active tab in view.
  useEffect(() => {
    window.scrollTo(0, 0);
    const nav = navRef.current;
    const active = nav?.querySelector('button.on');
    if (nav && active) {
      const n = nav.getBoundingClientRect();
      const b = active.getBoundingClientRect();
      if (b.left < n.left || b.right > n.right) nav.scrollLeft += b.left - n.left - (n.width - b.width) / 2;
    }
  }, [pathname]);

  return (
    <>
      <div className="lay">
        <aside className="side">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 6px' }}>
            <div
              style={{
                flex: 'none',
                width: 52,
                height: 52,
                borderRadius: 14,
                background: '#FFFFFF',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <img src="/bp-logo.png" alt="bp" style={{ height: 40, width: 'auto', display: 'block' }} />
            </div>
            <h1 style={{ padding: 0 }}>EOSL Decision Intelligence</h1>
          </div>
          <nav ref={navRef} aria-label="Pages">
            {PAGES.map((p) => (
              <button
                key={p.key}
                type="button"
                className={p.path === pathname ? 'on' : ''}
                aria-current={p.path === pathname ? 'page' : undefined}
                onClick={() => void navigate(p.path)}
              >
                {p.label}
              </button>
            ))}
          </nav>
        </aside>
        <main className="main">
          <div className="app" id="pg">
            <Outlet />
          </div>
        </main>
      </div>
      <GenieAssistant />
    </>
  );
}
