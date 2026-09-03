import { NavLink, Outlet } from "react-router-dom";
import {
  IconGrid,
  IconHistory,
  IconList,
  IconPiggyBank,
  IconRepeat,
  IconSettings,
  IconTag,
  IconUpload,
  IconWand,
} from "./icons";

const NAV = [
  { to: "/", label: "Áttekintés", icon: IconGrid, end: true },
  { to: "/tranzakciok", label: "Tranzakciók", icon: IconList },
  { to: "/megtakaritas", label: "Megtakarítás", icon: IconPiggyBank },
  { to: "/ismetlodok", label: "Ismétlődők", icon: IconRepeat },
  { to: "/import", label: "Import", icon: IconUpload },
  { to: "/kategoriak", label: "Kategóriák", icon: IconTag },
  { to: "/szabalyok", label: "Szabályok", icon: IconWand },
  { to: "/elozmenyek", label: "Előzmények", icon: IconHistory },
  { to: "/beallitasok", label: "Beállítások", icon: IconSettings },
];

export function Layout() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">S</span>
          <span className="brand-name">Savings</span>
        </div>
        <nav className="nav">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-link${isActive ? " is-active" : ""}`}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">privát hálózat · v0.1</div>
      </aside>
      <main className="content">
        <Outlet />
      </main>

      <style>{`
        .shell {
          display: grid;
          grid-template-columns: 232px 1fr;
          min-height: 100svh;
        }
        .sidebar {
          background: var(--paper-sunken);
          border-right: 1px solid var(--hairline);
          padding: 28px 18px;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100svh;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 8px 28px;
        }
        .brand-mark {
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          background: var(--accent);
          color: var(--accent-ink);
          border-radius: 8px;
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 16px;
        }
        .brand-name {
          font-family: var(--font-display);
          font-size: 19px;
          font-weight: 600;
          letter-spacing: -0.01em;
        }
        .nav {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 9px 10px;
          border-radius: var(--radius-sm);
          color: var(--ink-soft);
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .nav-link:hover {
          background: var(--paper-raised);
          color: var(--ink);
        }
        .nav-link.is-active {
          background: var(--accent-soft);
          color: var(--accent-soft-ink);
        }
        .sidebar-foot {
          margin-top: auto;
          padding: 0 8px;
          font-size: 11px;
          color: var(--ink-faint);
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }
        .content {
          padding: 36px 44px 60px;
          min-width: 0;
        }
        @media (max-width: 860px) {
          .shell { grid-template-columns: 1fr; }
          .sidebar {
            position: static;
            height: auto;
            flex-direction: row;
            align-items: center;
            padding: 14px 16px;
          }
          .brand { padding: 0 12px 0 0; }
          .nav { flex-direction: row; overflow-x: auto; }
          .nav-link span { display: none; }
          .sidebar-foot { display: none; }
          .content { padding: 24px 20px 40px; }
        }
      `}</style>
    </div>
  );
}
