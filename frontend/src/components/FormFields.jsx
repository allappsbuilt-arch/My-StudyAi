/**
 * Form inputs with label, icon, error and hint support.
 */
import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function Field({ label, error, hint, htmlFor, children }) {
  return (
    <div className="field">
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {error ? <span className="field-error" role="alert">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}

export function TextInput({ label, error, hint, icon: Icon, className = '', id, ...rest }) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <Field label={label} error={error} hint={hint} htmlFor={inputId}>
      <div className="input-wrap">
        {Icon && <Icon size={18} className="input-icon" />}
        <input id={inputId} className={`input ${Icon ? 'has-icon' : ''} ${error ? 'invalid' : ''} ${className}`} aria-invalid={Boolean(error)} {...rest} />
      </div>
    </Field>
  );
}

export function PasswordInput({ label, error, hint, icon: Icon, id, ...rest }) {
  const [show, setShow] = useState(false);
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <Field label={label} error={error} hint={hint} htmlFor={inputId}>
      <div className="input-wrap">
        {Icon && <Icon size={18} className="input-icon" />}
        <input
          id={inputId}
          type={show ? 'text' : 'password'}
          className={`input has-action ${Icon ? 'has-icon' : ''} ${error ? 'invalid' : ''}`}
          aria-invalid={Boolean(error)}
          {...rest}
        />
        <button type="button" className="icon-btn plain sm input-action" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </Field>
  );
}

export function TextArea({ label, error, hint, id, className = '', ...rest }) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <Field label={label} error={error} hint={hint} htmlFor={inputId}>
      <textarea id={inputId} className={`textarea ${error ? 'invalid' : ''} ${className}`} aria-invalid={Boolean(error)} {...rest} />
    </Field>
  );
}

export function Select({ label, error, hint, id, options = [], placeholder, ...rest }) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <Field label={label} error={error} hint={hint} htmlFor={inputId}>
      <select id={inputId} className="select" {...rest}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const value = typeof o === 'string' ? o : o.value;
          const text = typeof o === 'string' ? o : o.label;
          return (
            <option key={value} value={value}>
              {text}
            </option>
          );
        })}
      </select>
    </Field>
  );
}

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <label className="toggle">
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span className="track"><span className="thumb" /></span>
    </label>
  );
}

export function SearchBar({ value, onChange, placeholder = 'Search...', icon: Icon }) {
  return (
    <div className="search-bar">
      {Icon && <Icon size={19} />}
      <input className="input" type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  );
}
