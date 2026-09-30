import { Home, Compass, Mic, Users, Gamepad2, Sparkles, CalendarCheck, Layers, BarChart3, NotebookPen, FolderOpen } from 'lucide-react';

/** Bottom tabs: Home, Explore, Record (raised centre mic), Socials, Games. Labels are i18n keys. */
export const NAV_ITEMS = [
  { to: '/home', label: 'nav.home', icon: Home },
  { to: '/explore', label: 'nav.explore', icon: Compass },
  { to: '/record', label: 'nav.record', icon: Mic, center: true },
  { to: '/socials', label: 'nav.socials', icon: Users },
  { to: '/games', label: 'nav.games', icon: Gamepad2 },
];

/** Extra links shown in the desktop sidebar. */
export const SIDEBAR_EXTRA = [
  { to: '/tutor', label: 'nav.tutor', icon: Sparkles },
  { to: '/plan', label: 'nav.plan', icon: CalendarCheck },
  { to: '/flashcards', label: 'nav.flashcards', icon: Layers },
  { to: '/notes', label: 'nav.notes', icon: NotebookPen },
  { to: '/materials', label: 'nav.materials', icon: FolderOpen },
  { to: '/progress', label: 'nav.progress', icon: BarChart3 },
];
