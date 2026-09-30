/**
 * Create Flashcards - choose a method (Manual / AI from File / AI from Topic / Import),
 * fill in the set details, then save the set and its cards to Supabase.
 */
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenSquare, FileText, Lightbulb, Download, ArrowLeft, Plus, Trash2, Sparkles, X, Image as ImageIcon, Video, FolderOpen } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { flashcardApi, materialApi, analysisApi, toolsApi, getErrorMessage } from '../services/api';
import { Page } from '../navigation/AppLayout';
import { SimpleHeader } from '../components/Ui';
import Button from '../components/Button';
import { TextInput, TextArea, Select } from '../components/FormFields';
import { Alert, Spinner } from '../components/Feedback';
import AiNotice from '../components/AiNotice';
import { SUBJECTS } from '../utils/constants';

/** "front, back" / tab / " - " separated lines (Quizlet, Anki and CSV exports). */
export function parseImport(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.includes('\t') ? line.split('\t') : line.includes(';') ? line.split(';') : line.includes(' - ') ? line.split(' - ') : line.split(',');
      const [front, ...rest] = parts;
      return { front: (front || '').replace(/^"|"$/g, '').trim(), back: rest.join(', ').replace(/^"|"$/g, '').trim() };
    })
    .filter((c) => c.front && c.back);
}

export default function CreateFlashcardsScreen() {
  const { t } = useI18n();
  const toast = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [method, setMethod] = useState(null);
  const [info, setInfo] = useState({ title: '', description: '', subject: '' });
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [cards, setCards] = useState([{ front: '', back: '' }]);
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState('12');
  const [materialId, setMaterialId] = useState('');
  const [importText, setImportText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const [uploadStep, setUploadStep] = useState(''); // '' | uploading | analysing | generating
  const [uploadName, setUploadName] = useState('');

  /** Upload Content: file -> Supabase Storage -> AI analysis -> AI flashcards in the editor below. */
  const pickUpload = (accept) => {
    if (!fileRef.current) return;
    fileRef.current.accept = accept;
    fileRef.current.click();
  };
  const onUploadFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setUploadName(file.name);
    try {
      setUploadStep('uploading');
      const { material } = await materialApi.upload(file, { subject: info.subject || undefined });
      setUploadStep('analysing');
      await analysisApi.start(material.id);
      for (let i = 0; i < 150; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const st = await analysisApi.get(material.id);
        if (st.status === 'completed') break;
        if (st.status === 'failed') throw new Error(st.error || 'The AI could not analyse this file.');
      }
      setUploadStep('generating');
      const res = await toolsApi.flashcards({ materialId: material.id, subject: info.subject, count: Number(count) });
      setMaterialId(String(material.id));
      setCards(res.cards);
      if (!info.title) setInfo((i) => ({ ...i, title: res.topic }));
      toast.success(`${res.cards.length} cards generated from ${file.name}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploadStep('');
    }
  };

  const materials = useApi(() => (method === 'file' ? materialApi.list() : Promise.resolve(null)), [method]);

  const subjects = [...new Set([...(user?.preferences?.subjects || []).slice(0, 6), 'Mathematics', 'Physics', 'Chemistry', ...SUBJECTS])];

  const addTag = () => {
    const tg = tagInput.trim();
    if (tg && !tags.includes(tg) && tags.length < 10) setTags([...tags, tg]);
    setTagInput('');
  };

  const generate = async () => {
    setError('');
    setGenerating(true);
    try {
      const res = await toolsApi.flashcards({ topic: method === 'topic' ? topic : undefined, subject: info.subject, count: Number(count), materialId: method === 'file' ? materialId : undefined });
      setCards(res.cards);
      if (!info.title) setInfo((i) => ({ ...i, title: res.topic }));
      toast.success(`${res.cards.length} cards generated - review them below`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const doImport = () => {
    const parsed = parseImport(importText);
    if (!parsed.length) return setError('No cards found. Put one card per line as "front, back" (or tab-separated).');
    setError('');
    setCards(parsed);
    toast.success(`${parsed.length} cards imported`);
  };

  const save = async () => {
    setError('');
    const clean = cards.filter((c) => c.front.trim() && c.back.trim());
    if (!info.title.trim()) return setError('Give your set a title.');
    if (!info.subject) return setError('Choose a subject.');
    if (!clean.length) return setError('Add at least one card with a front and a back.');
    setSaving(true);
    try {
      const { deck } = await flashcardApi.createDeck({ ...info, tags, cards: clean, materialId: method === 'file' ? materialId || null : null });
      toast.success('Flashcard set created');
      navigate(`/flashcards/${deck.id}`, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  if (!method) {
    return (
      <Page>
        <SimpleHeader title={t('fc.create')} />
        <h2 className="center" style={{ margin: '12px 0 20px' }}>{t('fc.how')}</h2>
        <div className="method-grid stagger">
          {[
            { id: 'manual', icon: PenSquare, t: 'fc.manual', d: 'fc.manualSub' },
            { id: 'file', icon: FileText, t: 'fc.aiFile', d: 'fc.aiFileSub' },
            { id: 'topic', icon: Lightbulb, t: 'fc.aiTopic', d: 'fc.aiTopicSub' },
            { id: 'import', icon: Download, t: 'fc.import', d: 'fc.importSub' },
          ].map((m) => (
            <button key={m.id} className="method-card" onClick={() => { setMethod(m.id); setCards(m.id === 'manual' ? [{ front: '', back: '' }] : []); }}>
              <span className="icon-tile"><m.icon size={22} /></span>
              <span className="t">{t(m.t)}</span>
              <span className="d">{t(m.d)}</span>
            </button>
          ))}
        </div>
      </Page>
    );
  }

  const analysed = (materials.data?.materials || []).filter((m) => m.hasAnalysis);

  return (
    <Page>
      <SimpleHeader title={t('fc.create')} />
      <button className="btn ghost sm" style={{ paddingLeft: 0, marginBottom: 8 }} onClick={() => setMethod(null)}>
        <ArrowLeft size={16} /> Choose different method
      </button>

      <div className="card stack">
        <h3>Basic Information</h3>
        <TextInput label="Title *" placeholder="e.g. French Revolution Key Terms" value={info.title} onChange={(e) => setInfo({ ...info, title: e.target.value })} maxLength={150} />
        <TextArea label="Description" placeholder="What's this set about?" value={info.description} onChange={(e) => setInfo({ ...info, description: e.target.value })} style={{ minHeight: 80 }} />
        <div className="field">
          <label>Subject *</label>
          <div className="chips">
            {subjects.slice(0, 12).map((s) => (
              <button key={s} type="button" className={`chip ${info.subject === s ? 'active' : ''}`} onClick={() => setInfo({ ...info, subject: s })} aria-pressed={info.subject === s}>{s}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="tag-input">Tags</label>
          <div className="row">
            <input id="tag-input" className="input filled" placeholder="Add tags..." value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} maxLength={30} />
            <button type="button" className="icon-btn primary" onClick={addTag} aria-label="Add tag"><Plus size={20} /></button>
          </div>
          {tags.length > 0 && (
            <div className="chips wrap">
              {tags.map((tg) => (
                <button key={tg} type="button" className="chip outline" onClick={() => setTags(tags.filter((x) => x !== tg))}>#{tg} <X size={12} /></button>
              ))}
            </div>
          )}
        </div>
      </div>

      {method === 'manual' && (
        <div className="card stack" style={{ marginTop: 14 }}>
          <h3>{t('fc.uploadContent')}</h3>
          <div className="method-grid">
            {[
              { k: 'document', icon: FileText, label: t('fc.document'), accept: '.pdf,.docx,.txt,.md' },
              { k: 'image', icon: ImageIcon, label: t('fc.image'), accept: '.jpg,.jpeg,.png,.webp' },
              { k: 'video', icon: Video, label: t('fc.video'), accept: '.mp4' },
              { k: 'library', icon: FolderOpen, label: t('fc.fromLibrary') },
            ].map((o) => (
              <button key={o.k} type="button" className="method-card" style={{ padding: '18px 10px' }} disabled={Boolean(uploadStep)} onClick={() => (o.accept ? pickUpload(o.accept) : setMethod('file'))}>
                <span className="icon-tile"><o.icon size={22} /></span>
                <span className="t">{o.label}</span>
              </button>
            ))}
          </div>
          <input ref={fileRef} type="file" hidden onChange={onUploadFile} />
          {uploadStep && (
            <div className="row small text-2">
              <Spinner /> {uploadName}: {uploadStep === 'uploading' ? 'uploading…' : uploadStep === 'analysing' ? 'AI is reading the file…' : 'creating flashcards…'}
            </div>
          )}
        </div>
      )}

      {(method === 'file' || method === 'topic') && (
        <div className="card stack" style={{ marginTop: 14 }}>
          <h3>{method === 'file' ? t('fc.aiFile') : t('fc.aiTopic')}</h3>
          <AiNotice />
          {method === 'file' ? (
            analysed.length ? (
              <Select label="Material" value={materialId} onChange={(e) => setMaterialId(e.target.value)} placeholder="Choose an analysed material" options={analysed.map((m) => ({ value: String(m.id), label: m.filename }))} />
            ) : (
              <Alert type="info">No analysed materials yet. Upload a file and let the AI analyse it first.</Alert>
            )
          ) : (
            <TextInput label="Topic" placeholder="e.g. Cell structure and organelles" value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={200} />
          )}
          <Select label="Number of cards" value={count} onChange={(e) => setCount(e.target.value)} options={['6', '12', '20', '30']} />
          <Button icon={<Sparkles size={18} />} loading={generating} disabled={method === 'file' ? !materialId : topic.trim().length < 2} onClick={generate}>
            Generate cards
          </Button>
        </div>
      )}

      {method === 'import' && (
        <div className="card stack" style={{ marginTop: 14 }}>
          <h3>{t('fc.import')}</h3>
          <TextArea label="Paste your cards (one per line: front, back - or tab-separated from Quizlet / Anki)" value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={'Mitochondria, Powerhouse of the cell\nOsmosis\tMovement of water across a membrane'} />
          <Button variant="secondary" icon={<Download size={18} />} onClick={doImport} disabled={!importText.trim()}>Import cards</Button>
        </div>
      )}

      {(method === 'manual' || cards.length > 0) && (
        <div className="card stack" style={{ marginTop: 14 }}>
          <div className="row-between">
            <h3>Cards ({cards.filter((c) => c.front && c.back).length})</h3>
            <Button size="sm" variant="soft" icon={<Plus size={15} />} onClick={() => setCards([...cards, { front: '', back: '' }])}>Add card</Button>
          </div>
          <div className="card-editor">
            {cards.map((c, i) => (
              <div key={i} className="pair">
                <input className="input filled" placeholder={`Front ${i + 1}`} value={c.front} onChange={(e) => setCards(cards.map((x, j) => (j === i ? { ...x, front: e.target.value } : x)))} aria-label={`Card ${i + 1} front`} />
                <input className="input filled back-input" placeholder="Back" value={c.back} onChange={(e) => setCards(cards.map((x, j) => (j === i ? { ...x, back: e.target.value } : x)))} aria-label={`Card ${i + 1} back`} />
                <button type="button" className="icon-btn plain" onClick={() => setCards(cards.filter((_, j) => j !== i))} aria-label={`Remove card ${i + 1}`}><Trash2 size={17} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div style={{ marginTop: 14 }}><Alert>{error}</Alert></div>}
      <Button block size="lg" style={{ marginTop: 16 }} loading={saving} onClick={save}>{t('common.save')}</Button>
    </Page>
  );
}
