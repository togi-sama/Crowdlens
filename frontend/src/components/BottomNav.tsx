import { Link, useLocation } from "react-router-dom";
import "./BottomNav.css";

const NAV_GREEN  = "#30924C";
const NAV_GREY   = "#b2bec3";

function AccountIcon({ active }: { active: boolean }) {
  const c = active ? NAV_GREEN : NAV_GREY;
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <circle cx="18" cy="13" r="6" stroke={c} strokeWidth="2.4" strokeLinejoin="round" />
      <path
        d="M6 32c0-6.627 5.373-12 12-12s12 5.373 12 12"
        stroke={c}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface NavLink {
  to: string;
  label: string;
  icon?: string;
  iconActive?: string;
  renderIcon?: (active: boolean) => React.ReactNode;
}

export default function BottomNav() {
  const { pathname } = useLocation();

  const links: NavLink[] = [
    {
      to: "/home",
      label: "Home",
      icon: "/Home.png",
      iconActive: "/Home Selected.png",
    },
    {
      to: "/favorites",
      label: "Favorites",
      icon: "/Favorites.png",
      iconActive: "/Favorites Selected.png",
    },
    {
      to: "/settings",
      label: "Account",
      renderIcon: (active) => <AccountIcon active={active} />,
    },
  ];

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {links.map(({ to, label, icon, iconActive, renderIcon }) => {
        const active = pathname === to;
        return (
          <div className="nav-section" key={to}>
            <Link to={to} className="nav-item" aria-current={active ? "page" : undefined}>
              {renderIcon ? (
                renderIcon(active)
              ) : (
                <img
                  src={active ? iconActive : icon}
                  alt={label}
                  className="nav-icon"
                />
              )}
              <p className={`nav-text${active ? " nav-text-active" : ""}`}>{label}</p>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
