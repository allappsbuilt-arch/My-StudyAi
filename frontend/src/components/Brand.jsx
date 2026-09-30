/**
 * MyStudyAI logo (an open book with a spark - original artwork), avatar, and bot icon.
 */
import { initials } from '../utils/format';

export function LogoMark({ size = 40, className = 'logo-mark' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="msai-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#0b1220" />
      <path d="M14 22c6-3 12-3 18 1v24c-6-4-12-4-18-1z" fill="url(#msai-g)" />
      <path d="M50 22c-6-3-12-3-18 1v24c6-4 12-4 18-1z" fill="url(#msai-g)" opacity=".75" />
      <path d="M47 9l1.8 4.2L53 15l-4.2 1.8L47 21l-1.8-4.2L41 15l4.2-1.8z" fill="#93c5fd" />
    </svg>
  );
}

export function Brand({ size = 36 }) {
  return (
    <div className="brand">
      <LogoMark size={size} />
      <span>
        MyStudy<span className="brand-accent">AI</span>
      </span>
    </div>
  );
}

/** Small bot face used for the AI tutor (on a dark tile). */
export function BotIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="7" width="16" height="12" rx="5" fill="#3b82f6" />
      <circle cx="9.5" cy="13" r="1.6" fill="#fff" />
      <circle cx="14.5" cy="13" r="1.6" fill="#fff" />
      <path d="M12 3.5v3.5" stroke="#93c5fd" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="3.2" r="1.3" fill="#93c5fd" />
    </svg>
  );
}

export function Avatar({ user, size }) {
  const cls = `avatar ${size || ''}`;
  if (user?.avatarUrl) {
    return (
      <div className={cls}>
        <img src={user.avatarUrl} alt={user.name} />
      </div>
    );
  }
  return (
    <div className={cls} aria-hidden="true">
      {initials(user?.name)}
    </div>
  );
}
