/**
 * 6. AI Tutor - full chat interface.
 * Conversations are saved on the server; "New chat" starts a fresh one,
 * and the history drawer lets the student reopen or delete old chats.
 * Opening with state { prompt } sends that question immediately (from Home's Ask box),
 * and { materialId } makes the tutor answer using that study material.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { History, Plus, SendHorizontal, Trash2, X, Mic, MicOff, FileText, MessageSquare, ArrowLeft } from 'lucide-react';
import { aiApi, getErrorMessage, materialApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { BotIcon } from '../components/Brand';
import Markdown from '../components/Markdown';
import AiNotice from '../components/AiNotice';
import { ConfirmDialog } from '../components/Modal';
import { Spinner } from '../components/Feedback';
import { TUTOR_SUGGESTIONS } from '../utils/constants';
import { timeAgo } from '../utils/format';

const SpeechRecognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export default function AITutorScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const [conversationId, setConversationId] = useState(location.state?.conversationId || null);
  const [materialId, setMaterialId] = useState(location.state?.materialId || null);
  const [materialName, setMaterialName] = useState('');
  const [messages, setMessages] = useState([]); // { role: 'user'|'ai'|'error', text, id }
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [conversations, setConversations] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [listening, setListening] = useState(false);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const autoSent = useRef(false);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  };

  // Load an existing conversation
  useEffect(() => {
    if (!conversationId || messages.length) return;
    let cancelled = false;
    setLoadingThread(true);
    aiApi
      .conversation(conversationId)
      .then((res) => {
        if (cancelled) return;
        setMessages(res.messages.flatMap((m) => [{ role: 'user', text: m.message, id: `u${m.id}` }, { role: 'ai', text: m.response, id: `a${m.id}` }]));
        scrollToBottom();
      })
      .catch((err) => !cancelled && toast.error(getErrorMessage(err)))
      .finally(() => !cancelled && setLoadingThread(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Show which material the chat is about
  useEffect(() => {
    if (!materialId) return;
    materialApi.get(materialId).then((r) => setMaterialName(r.analysis?.title || r.material.filename)).catch(() => setMaterialId(null));
  }, [materialId]);

  const send = useCallback(
    async (textArg) => {
      const text = (textArg ?? input).trim();
      if (!text || sending) return;
      setInput('');
      setMessages((m) => [...m.filter((x) => x.role !== 'error'), { role: 'user', text, id: `tmp${Date.now()}` }]);
      setSending(true);
      scrollToBottom();
      try {
        const res = await aiApi.chat({ message: text, conversationId: conversationId || undefined, materialId: materialId || undefined });
        setConversationId(res.conversationId);
        setMessages((m) => [...m, { role: 'ai', text: res.exchange.response, id: `a${res.exchange.id}` }]);
        setConversations(null); // refresh list next time the drawer opens
      } catch (err) {
        setMessages((m) => [...m, { role: 'error', text: getErrorMessage(err), id: `e${Date.now()}`, retry: text }]);
      } finally {
        setSending(false);
        scrollToBottom();
        inputRef.current?.focus();
      }
    },
    [input, sending, conversationId, materialId]
  );

  // Question typed on the Home screen
  useEffect(() => {
    if (location.state?.prompt && !autoSent.current) {
      autoSent.current = true;
      send(location.state.prompt);
      navigate(location.pathname, { replace: true, state: { ...location.state, prompt: undefined } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const newChat = () => {
    setConversationId(null);
    setMessages([]);
    setMaterialId(null);
    setDrawerOpen(false);
    inputRef.current?.focus();
  };

  const openDrawer = async () => {
    setDrawerOpen(true);
    if (!conversations) {
      try {
        const res = await aiApi.conversations();
        setConversations(res.conversations);
      } catch (err) {
        toast.error(getErrorMessage(err));
        setConversations([]);
      }
    }
  };

  const openConversation = (id) => {
    if (id === conversationId) return setDrawerOpen(false);
    setMessages([]);
    setMaterialId(null);
    setConversationId(id);
    setDrawerOpen(false);
  };

  const deleteConversation = async (id) => {
    try {
      await aiApi.deleteConversation(id);
      setConversations((c) => c.filter((x) => x.conversationId !== id));
      if (id === conversationId) newChat();
      toast.success('Conversation deleted');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const clearAll = async () => {
    try {
      await aiApi.clearHistory();
      setConversations([]);
      newChat();
      toast.success('Chat history cleared');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setConfirmClear(false);
    }
  };

  // Voice input (Chrome / Edge)
  const toggleVoice = () => {
    if (!SpeechRecognition) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = navigator.language || 'en-US';
    rec.interimResults = true;
    rec.onresult = (e) => setInput(Array.from(e.results).map((r) => r[0].transcript).join(''));
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Auto-grow textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  return (
    <div className="chat-page">
      <div className="chat-header">
        <button className="icon-btn sm" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>
        <span className="bot">
          <BotIcon size={28} />
        </span>
        <div className="grow">
          <div className="bold">StudyAI Tutor</div>
          <div className="sub">{sending ? 'Thinking…' : 'Your personal AI study coach'}</div>
        </div>
        <button className="icon-btn sm" onClick={newChat} aria-label="New chat" title="New chat">
          <Plus size={20} />
        </button>
        <button className="icon-btn sm" onClick={openDrawer} aria-label="Chat history" title="Chat history">
          <History size={18} />
        </button>
      </div>

      <div className="chat-scroll" ref={scrollRef} aria-live="polite">
        {loadingThread ? (
          <div className="page-loader"><Spinner /></div>
        ) : messages.length === 0 && !sending ? (
          <div className="chat-welcome fade-in">
            <div className="wave">👋</div>
            <h2>Hi! I’m StudyAI</h2>
            <p className="text-2" style={{ maxWidth: 360 }}>
              Your personal AI study assistant. Ask me to explain a concept, solve a problem step by step, or plan your revision.
            </p>
            <div className="chips wrap" style={{ marginTop: 8 }}>
              {TUTOR_SUGGESTIONS.map((s) => (
                <button key={s.text} className="chip outline" onClick={() => send(s.text)}>
                  <span aria-hidden="true">{s.emoji}</span> {s.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className="msg user">
                <div className="bubble">{m.text}</div>
              </div>
            ) : (
              <div key={m.id} className={`msg ai ${m.role === 'error' ? 'error' : ''}`}>
                <span className="mini-bot">
                  <BotIcon size={20} />
                </span>
                <div className="bubble">
                  {m.role === 'error' ? (
                    <div className="stack" style={{ gap: 8 }}>
                      <span>{m.text}</span>
                      <button className="btn sm danger-soft" style={{ alignSelf: 'flex-start' }} onClick={() => { setMessages((all) => all.filter((x) => x.id !== m.id && x.text !== m.retry)); send(m.retry); }}>
                        Retry
                      </button>
                    </div>
                  ) : (
                    <Markdown>{m.text}</Markdown>
                  )}
                </div>
              </div>
            )
          )
        )}
        {sending && (
          <div className="msg ai">
            <span className="mini-bot">
              <BotIcon size={20} />
            </span>
            <div className="bubble">
              <span className="typing" aria-label="StudyAI is typing">
                <span />
                <span />
                <span />
              </span>
            </div>
          </div>
        )}
      </div>

      {materialId && materialName && (
        <div className="chat-context">
          <FileText size={16} />
          <span className="grow truncate">Answering from: {materialName}</span>
          <button className="icon-btn plain sm" onClick={() => setMaterialId(null)} aria-label="Stop using this material" style={{ color: 'inherit', width: 28, height: 28 }}>
            <X size={16} />
          </button>
        </div>
      )}

      <AiNotice style={{ margin: '0 16px 8px' }} />
      <div className="chat-input-bar">
        <div className="chat-input">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={listening ? 'Listening…' : 'Ask StudyAI anything...'}
            aria-label="Message"
            maxLength={8000}
          />
          {SpeechRecognition && (
            <button className={`icon-btn plain ${listening ? 'primary' : ''}`} onClick={toggleVoice} aria-label={listening ? 'Stop voice input' : 'Voice input'}>
              {listening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          )}
          <button className="icon-btn primary" onClick={() => send()} disabled={!input.trim() || sending} aria-label="Send message">
            <SendHorizontal size={20} />
          </button>
        </div>
      </div>

      {drawerOpen && (
        <>
          <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />
          <aside className="drawer" role="dialog" aria-label="Chat history">
            <div className="row-between">
              <h2>Chat History</h2>
              <button className="icon-btn plain sm" onClick={() => setDrawerOpen(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <button className="btn block" onClick={newChat}>
              <Plus size={18} /> New Chat
            </button>
            <div className="list">
              {conversations === null ? (
                <div className="page-loader"><Spinner /></div>
              ) : conversations.length === 0 ? (
                <p className="small muted center" style={{ padding: 20 }}>No saved chats yet.</p>
              ) : (
                conversations.map((c) => (
                  <div key={c.conversationId} className="row" style={{ gap: 4 }}>
                    <button className={`convo ${c.conversationId === conversationId ? 'active' : ''}`} onClick={() => openConversation(c.conversationId)}>
                      <MessageSquare size={17} style={{ flexShrink: 0 }} />
                      <span className="grow">
                        <span className="small bold truncate" style={{ display: 'block' }}>{c.title}</span>
                        <span className="tiny muted">{timeAgo(c.lastMessageAt)} · {c.messageCount} messages</span>
                      </span>
                    </button>
                    <button className="icon-btn plain sm" onClick={() => deleteConversation(c.conversationId)} aria-label="Delete conversation">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
            {conversations?.length > 0 && (
              <button className="btn danger-soft block sm" onClick={() => setConfirmClear(true)}>
                <Trash2 size={16} /> Clear all history
              </button>
            )}
          </aside>
        </>
      )}

      <ConfirmDialog
        open={confirmClear}
        title="Clear all chats?"
        message="This permanently deletes every AI Tutor conversation."
        confirmLabel="Clear history"
        onConfirm={clearAll}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}
