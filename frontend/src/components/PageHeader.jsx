/** Screen title row with optional back button and right-side actions. */
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PageHeader({ title, eyebrow, back, actions, left }) {
  const navigate = useNavigate();
  const goBack = () => {
    if (typeof back === 'string') navigate(back);
    else if (window.history.length > 1) navigate(-1);
    else navigate('/home');
  };
  return (
    <header className="page-header">
      {back && (
        <button className="icon-btn" onClick={goBack} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
      )}
      {left}
      <div className="titles">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="truncate">{title}</h1>
      </div>
      {actions}
    </header>
  );
}
