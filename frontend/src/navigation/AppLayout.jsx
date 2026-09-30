/**
 * Layout for logged-in screens: page content + bottom nav (mobile) / sidebar (desktop).
 * Also starts the study-time tracker.
 */
import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import { useStudyTimer } from '../hooks/useStudyTimer';
import { useDailyReminder } from '../hooks/useDailyReminder';
import { useAuth } from '../context/AuthContext';
import PreviewBanner from '../components/PreviewBanner';

export default function AppLayout() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  useStudyTimer(true);
  useDailyReminder(user);

  // Start every new screen at the top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="app-shell with-nav">
      <Sidebar />
      <PreviewBanner />
      <Outlet />
      <BottomNav />
    </div>
  );
}

/** Standard page container. `wide` allows a wider layout on desktop. */
export function Page({ children, wide }) {
  return <main className={`app-main page-enter ${wide ? 'wide' : ''}`}>{children}</main>;
}
