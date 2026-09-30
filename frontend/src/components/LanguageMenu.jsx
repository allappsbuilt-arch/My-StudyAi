/** Compact language picker (globe + select) used on the auth screens. */
import { Globe } from 'lucide-react';
import { LANGUAGES, useI18n } from '../context/I18nContext';

export default function LanguageMenu() {
  const { lang, setLang } = useI18n();
  return (
    <label className="lang-pill" style={{ cursor: 'pointer', paddingRight: 8 }}>
      <Globe size={16} />
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        aria-label="Language"
        style={{ border: 0, background: 'transparent', color: 'inherit', font: 'inherit', cursor: 'pointer', outline: 'none' }}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.native}
          </option>
        ))}
      </select>
    </label>
  );
}
