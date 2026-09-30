/**
 * Quick AI study coach that slides up over the current screen (reference: "Hi! I'm ... 👋").
 * Chips jump to the matching tool; typed or spoken questions are answered inline
 * (same conversation as the full AI Tutor, which can be opened from the header).
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Mic, MicOff, Send, Maximize2 } from 'lucide-react';
import { aiApi, getErrorMessage } from '../services/api';
import { useSpeechRecognition } from '../hooks/useSpeech';
import { useI18n } from '../context/I18nContext';
import { BotIcon } from './Brand';
import Markdown from './Markdown';

export default function AssistantSheet({ open, onClose, initialPrompt }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const mic = useSpeechRecognition({ continuous: false });

  useEffect(() => {
    if (mic.transcript) setInput((v) => `${v}${v ? ' ' : ''}${mic.transcript}`);
    mic.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mic.transcript]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (initialPrompt) send(initialPrompt);
    else setTimeout(() => inputRef.current?.focus(), 250);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  async function send(textArg) {
    const text = (textArg ?? input).trim();
    if (!text || sending) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text, id: `u${Date.now()}` }]);
    setSending(true);
    try {
      const res = await aiApi.chat({ message: text, conversationId: conversationId || undefined });
      setConversationId(res.conversationId);
      setMessages((m) => [...m, { role: 'ai', text: res.exchange.response, id: `a${res.exchange.id}` }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'error', text: getErrorMessage(err), id: `e${Date.now()}` }]);
    } finally {
      setSending(false);
    }
  }

  const go = (to) => {
    onClose();
    navigate(to);
  };

  const CHIPS = [
    { emoji: '📚', label: t('assistant.summarize'), run: () => go('/summarize') },
    { emoji: '🎯', label: t('assistant.flashcards'), run: () => go('/flashcards/new') },
    { emoji: '📝', label: t('assistant.quiz'), run: () => go('/quiz') },
    { emoji: '💡', label: t('assistant.explain'), run: () => { setInput(`${t('assistant.explainPrefix')} `); inputRef.current?.focus(); } },
  ];

  if (!open) return null;
  return createPortal(
    <div className="assistant-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="assistant-sheet" role="dialog" aria-modal="true" aria-label={t('assistant.title')}>
        <header className="assistant-head">
          <span className="assistant-avatar"><BotIcon size={30} /></span>
          <div className="grow">
            <div className="bold" style={{ fontSize: '1.1rem' }}>StudyAI</div>
            <div className="small" style={{ opacity: 0.85 }}>{t('assistant.subtitle')}</div>
          </div>
          {conversationId && (
            <button className="assistant-x" onClick={() => go('/tutor')} aria-label="Open full chat" title="Open full chat">
              <Maximize2 size={18} />
            </button>
          )}
          <button className="assistant-x" onClick={onClose} aria-label={t('common.close')}><X size={22} /></button>
        </header>

        <div className="assistant-body" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="assistant-welcome">
              <div className="wave" aria-hidden="true">👋</div>
              <h2>{t('assistant.hi')}</h2>
              <p className="text-2">{t('assistant.intro')}</p>
              <div className="assistant-chips">
                {CHIPS.map((c) => (
                  <button key={c.label} className="assistant-chip" onClick={c.run}>
                    <span aria-hidden="true">{c.emoji}</span> {c.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="stack" style={{ gap: 12 }}>
              {messages.map((m) => (
                <div key={m.id} className={`msg ${m.role === 'user' ? 'user' : 'ai'} ${m.role === 'error' ? 'error' : ''}`}>
                  {m.role !== 'user' && <span className="mini-bot"><BotIcon size={20} /></span>}
                  <div className="bubble">{m.role === 'ai' ? <Markdown>{m.text}</Markdown> : m.text}</div>
                </div>
              ))}
              {sending && (
                <div className="msg ai">
                  <span className="mini-bot"><BotIcon size={20} /></span>
                  <div className="bubble"><span className="typing"><span /><span /><span /></span></div>
                </div>
              )}
            </div>
          )}
        </div>

        <form className="assistant-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
          {mic.supported && (
            <button type="button" className={`assistant-mic ${mic.listening ? 'live' : ''}`} onClick={mic.listening ? mic.stop : mic.start} aria-label="Voice input">
              {mic.listening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          )}
          <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('assistant.placeholder')} aria-label={t('assistant.placeholder')} maxLength={8000} />
          <button type="submit" className="assistant-send" disabled={!input.trim() || sending} aria-label="Send"><Send size={19} /></button>
        </form>
      </section>
    </div>,
    document.body
  );
}
