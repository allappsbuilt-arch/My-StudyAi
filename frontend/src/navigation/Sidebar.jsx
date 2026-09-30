/** Left sidebar for desktop screens (1024px and wider). */
import { NavLink, useNavigate } from 'react-router-dom';
import { Upload } from 'lucide-react';
import { Brand, Avatar } from '../components/Brand';
import Button from '../components/Button';
import { NAV_ITEMS, SIDEBAR_EXTRA } from './navItems';
import { useI18n } from '../context/I18nContext';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();
  const link = ({ to, label, icon: Icon }) => (
    <NavLink key={to} to={to} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
      <Icon size={20} />
      {t(label)}
    </NavLink>
  );
  return (
    <aside className="sidebar" aria-label="Main">
      <div className="brand">
        <Brand />
      </div>
      <div className="side-scroll">
        {NAV_ITEMS.map(link)}
        <div className="side-divider" />
        {SIDEBAR_EXTRA.map(link)}
      </div>
      <div className="side-cta">
        <Button block icon={<Upload size={18} />} onClick={() => navigate('/materials/upload')}>
          {t('nav.upload')}
        </Button>
        <NavLink to="/profile" className={({ isActive }) => `side-user ${isActive ? 'active' : ''}`}>
          <Avatar user={user} size="sm" />
          <span className="grow">
            <span className="bold small truncate" style={{ display: 'block' }}>{user?.name}</span>
            <span className="tiny muted">{t('nav.profile')}</span>
          </span>
        </NavLink>
      </div>
    </aside>
  );
}
