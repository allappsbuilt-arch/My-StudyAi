/**
 * Small UI building blocks shared by the screens:
 *  - SimpleHeader: "<- Title" bar with optional right-side actions
 *  - Tabs: underline tabs (Study Feed / Communities)
 *  - Segmented: pill switcher (Write / Improve / Structure)
 *  - AlertDialog: small "Saved!" style dialog with an OK button
 *  - ExploreRow: icon + title + description + chevron row
 */
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import Modal from './Modal';

export function SimpleHeader({ title, back = true, actions }) {
  const navigate = useNavigate();
  const goBack = () => {
    if (typeof back === 'string') navigate(back);
    else if (window.history.length > 1) navigate(-1);
    else navigate('/home');
  };
  return (
    <header className="simple-header">
      {back && (
        <button className="back" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={22} />
        </button>
      )}
      <h1 className="truncate">{title}</h1>
      {actions}
    </header>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} className={`tab ${value === t.value ? 'active' : ''}`} onClick={() => onChange(t.value)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)}>
          {o.icon && <o.icon size={16} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function AlertDialog({ open, title, message, onClose, okLabel = 'OK' }) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="alert-title" center>
      <div className="alert-dialog pop-in">
        <h2 id="alert-title">{title}</h2>
        <p className="text-2">{message}</p>
        <div className="foot">
          <button className="btn ghost sm" onClick={onClose} autoFocus>
            {okLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function ExploreRow({ icon: Icon, title, desc, onClick, right }) {
  return (
    <button className="explore-row" onClick={onClick}>
      <span className="icon-tile">
        <Icon size={22} />
      </span>
      <span className="grow">
        <span className="title" style={{ display: 'block' }}>{title}</span>
        {desc && <span className="desc" style={{ display: 'block' }}>{desc}</span>}
      </span>
      {right || <ChevronRight size={20} className="chev" />}
    </button>
  );
}
