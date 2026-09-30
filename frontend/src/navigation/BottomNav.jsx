/** Bottom navigation for phones and tablets (hidden on desktop): 4 tabs + raised mic button. */
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './navItems';
import { useI18n } from '../context/I18nContext';

export default function BottomNav() {
  const { t } = useI18n();
  return (
    <nav className="bottom-nav" aria-label="Main">
      {NAV_ITEMS.map(({ to, label, icon: Icon, center }) =>
        center ? (
          <div className="nav-fab-wrap" key={to}>
            <NavLink to={to} className={({ isActive }) => `nav-fab ${isActive ? 'active' : ''}`} aria-label={t(label)}>
              <Icon size={26} />
            </NavLink>
          </div>
        ) : (
          <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">
              <Icon size={21} />
            </span>
            <span className="nav-label">{t(label)}</span>
          </NavLink>
        )
      )}
    </nav>
  );
}
