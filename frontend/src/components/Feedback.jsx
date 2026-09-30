/**
 * Loading, empty and error states - used on every screen that loads data.
 */
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import Button from './Button';

export function Spinner({ size }) {
  return <span className={`spinner ${size === 'lg' ? 'lg' : ''}`} role="status" aria-label="Loading" />;
}

export function PageLoader({ label = 'Loading...' }) {
  return (
    <div className="page-loader">
      <Spinner size="lg" />
      <span>{label}</span>
    </div>
  );
}

export function Skeleton({ height = 16, width = '100%', radius, style }) {
  return <div className="skeleton" style={{ height, width, borderRadius: radius, ...style }} />;
}

export function SkeletonList({ count = 3, height = 72 }) {
  return (
    <div className="stack">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={height} radius={20} />
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="state fade-in">
      {Icon && (
        <div className="icon-tile">
          <Icon size={28} />
        </div>
      )}
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  const offline = /reach the MyStudyAI server|connection/i.test(message || '');
  const Icon = offline ? WifiOff : AlertTriangle;
  return (
    <div className="state fade-in">
      <div className="icon-tile danger">
        <Icon size={28} />
      </div>
      <h3>{offline ? "You're offline" : 'Something went wrong'}</h3>
      <p>{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={<RefreshCw size={16} />} onClick={() => onRetry()}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Alert({ type = 'error', icon: Icon = AlertTriangle, children }) {
  return (
    <div className={`alert ${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon size={18} />
      <div>{children}</div>
    </div>
  );
}
