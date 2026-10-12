import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { GenieAssistant } from '@/components/genie/GenieAssistant';
import { PAGES } from '@/pages';

/** Green header, nav tabs and the `#pg` page container from the prototype. */
export function Shell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const navRef = useRef<HTMLElement>(null);

  // The prototype scrolls to top on page change; in-page re-renders keep the scroll position.
  // On narrow screens the nav scrolls sideways, so keep the active tab in view (the app opens on
  // Lineage Explorer, which can start off-screen).
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
          <nav ref={navRef}>
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
      <GenieAssistant />
    </>
  );
}
