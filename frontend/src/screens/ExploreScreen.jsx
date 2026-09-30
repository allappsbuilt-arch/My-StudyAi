/** Explore - every feature in one place, grouped by category, with search and filter chips. */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Search, Layers, ListChecks, NotebookPen, FolderOpen, ScanLine, Languages, FileText, Mic, PenLine, Sparkles,
  CalendarCheck, BarChart3, Upload, Users, Gamepad2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { Page } from '../navigation/AppLayout';
import { Avatar } from '../components/Brand';
import { ExploreRow } from '../components/Ui';

const GROUPS = [
  {
    id: 'create', label: 'explore.create', items: [
      { k: 'flashcards', icon: Layers, to: '/flashcards' },
      { k: 'quizzes', icon: ListChecks, to: '/quiz' },
      { k: 'notes', icon: NotebookPen, to: '/notes' },
      { k: 'materials', icon: FolderOpen, to: '/materials' },
    ],
  },
  {
    id: 'ai', label: 'explore.ai', items: [
      { k: 'scan', icon: ScanLine, to: '/scan' },
      { k: 'translate', icon: Languages, to: '/translate' },
      { k: 'summarize', icon: FileText, to: '/summarize' },
      { k: 'lecture', icon: Mic, to: '/record' },
      { k: 'essay', icon: PenLine, to: '/essay' },
      { k: 'tutor', icon: Sparkles, to: '/tutor' },
    ],
  },
  {
    id: 'plan', label: 'explore.plan', items: [
      { k: 'plan', icon: CalendarCheck, to: '/plan' },
      { k: 'analytics', icon: BarChart3, to: '/progress' },
      { k: 'upload', icon: Upload, to: '/materials/upload' },
    ],
  },
  {
    id: 'community', label: 'explore.community', items: [
      { k: 'community', icon: Users, to: '/socials' },
      { k: 'games', icon: Gamepad2, to: '/games' },
    ],
  },
];

export default function ExploreScreen() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GROUPS.filter((g) => filter === 'all' || g.id === filter)
      .map((g) => ({
        ...g,
        items: g.items.filter((it) => !q || `${t(`f.${it.k}`)} ${t(`f.${it.k}.d`)}`.toLowerCase().includes(q)),
      }))
      .filter((g) => g.items.length);
  }, [query, filter, t]);

  return (
    <Page wide>
      <header className="top-bar">
        <Avatar user={user} />
        <div className="grow">
          <div className="hello">{t('explore.discover')}</div>
          <div className="name">{t('explore.title')}</div>
        </div>
        <button className="icon-btn" onClick={() => navigate('/profile/notifications')} aria-label={t('profile.notifications')}>
          <Bell size={20} />
        </button>
      </header>

      <div className="search-bar">
        <Search size={19} />
        <input className="input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('explore.search')} aria-label={t('explore.search')} />
      </div>

      <div className="chips" style={{ marginTop: 14 }}>
        {[{ id: 'all', label: 'explore.all' }, ...GROUPS].map((g) => (
          <button key={g.id} className={`chip ${filter === g.id ? 'active' : ''}`} onClick={() => setFilter(g.id)} aria-pressed={filter === g.id}>
            {t(g.label)}
          </button>
        ))}
      </div>

      {groups.length === 0 && <div className="card small text-2 center" style={{ marginTop: 18 }}>{t('explore.none')}</div>}

      {groups.map((g) => (
        <section key={g.id}>
          <div className="section-title">
            <h2>{t(g.label)}</h2>
            <span className="count">{g.items.length} {t('common.tools')}</span>
          </div>
          <div className="explore-grid stagger">
            {g.items.map((it) => (
              <ExploreRow key={it.k} icon={it.icon} title={t(`f.${it.k}`)} desc={t(`f.${it.k}.d`)} onClick={() => navigate(it.to)} />
            ))}
          </div>
        </section>
      ))}
    </Page>
  );
}
