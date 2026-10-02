/** Flashcards: set list, create (manual / AI from file / AI from topic / import), set detail, study session. */
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Check, Clock, Download, FileText, FolderOpen, Image as ImageIcon, Layers, Lightbulb, PartyPopper, PenSquare, Pencil, Play, Plus, RotateCcw, Sparkles, Trash2, Video, X } from 'lucide-react-native';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useApi } from '../hooks/useApi';
import { analysisApi, flashcardApi, getErrorMessage, materialApi, toolsApi } from '../services/api';
import Screen, { SectionHeader } from '../components/Screen';
import { Alert, Badge, Button, Card, Chip, ConfirmDialog, EmptyState, ErrorState, Field, IconButton, IconTile, PageLoader, ProgressBar, Row, Select, SkeletonList, Spinner, TextArea, TextInput, Txt } from '../components/Ui';
import { AiNotice } from '../components/Misc';
import { SUBJECTS } from '../utils/constants';
import { timeAgo } from '../utils/format';
import { pickDocument, pickImage } from '../utils/files';

/* ---------------------------------------------------------------- list */
export function FlashcardsScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const decks = useApi(() => flashcardApi.decks(), []);
  useEffect(() => navigation.addListener('focus', () => decks.reload({ silent: true })), [navigation]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Screen title={t('fc.title')} back actions={<Button size="sm" icon={Plus} onPress={() => navigation.navigate('CreateFlashcards')}>{t('fc.create')}</Button>}>
      {decks.loading && !decks.data ? <SkeletonList count={3} height={130} /> : decks.error && !decks.data ? <ErrorState message={decks.error} onRetry={decks.reload} /> : decks.data.decks.length === 0 ? (
        <EmptyState icon={Layers} title={t('fc.empty')} action={<Button icon={Plus} onPress={() => navigation.navigate('CreateFlashcards')}>{t('fc.create')}</Button>} />
      ) : decks.data.decks.map((d) => (
        <Card key={d.id} onPress={() => navigation.navigate('Deck', { id: d.id })} style={{ gap: 10 }}>
          <Row>
            <IconTile icon={Layers} size={38} />
            <View style={{ flex: 1 }}>
              <Txt bold numberOfLines={1}>{d.title}</Txt>
              <Txt size="xs" color="text2">{d.subject} · {d.cardCount} {t('fc.cards')}</Txt>
            </View>
            {d.dueCount > 0 ? <Badge tone="warning">{d.dueCount} {t('fc.due')}</Badge> : null}
          </Row>
          <ProgressBar thin value={d.mastery} />
          <Row between>
            <Txt size="xs" color="text2">{d.masteredCount}/{d.cardCount} {t('fc.mastered')}</Txt>
            <Row gap={4}><Clock size={12} color={colors.muted} /><Txt size="xs" color="text2">{timeAgo(d.lastStudiedAt || d.updatedAt)}</Txt></Row>
          </Row>
          <Button size="sm" variant="soft" icon={Play} disabled={!d.cardCount} onPress={() => navigation.navigate('FlashcardStudy', { id: d.id })}>{t('fc.study')}</Button>
        </Card>
      ))}
    </Screen>
  );
}

/** "front, back" / tab / " - " separated lines (Quizlet, Anki and CSV exports). */
export function parseImport(text) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const parts = line.includes('\t') ? line.split('\t') : line.includes(';') ? line.split(';') : line.includes(' - ') ? line.split(' - ') : line.split(',');
    const [front, ...rest] = parts;
    return { front: (front || '').replace(/^"|"$/g, '').trim(), back: rest.join(', ').replace(/^"|"$/g, '').trim() };
  }).filter((c) => c.front && c.back);
}

/* ---------------------------------------------------------------- create */
export function CreateFlashcardsScreen() {
  const { t } = useI18n();
  const toast = useToast();
  const { user } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation();
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
  const [uploadStep, setUploadStep] = useState('');
  const [uploadName, setUploadName] = useState('');

  /** Upload Content: file -> storage -> AI analysis -> AI flashcards in the editor below. */
  const uploadAndGenerate = async (kind) => {
    let file;
    try { file = kind === 'image' ? await pickImage() : await pickDocument(); } catch (err) { return setError(getErrorMessage(err)); }
    if (!file) return undefined;
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
    return undefined;
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
    return undefined;
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
      navigation.replace('Deck', { id: deck.id });
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
    return undefined;
  };

  if (!method) {
    const METHODS = [
      { id: 'manual', icon: PenSquare, t: 'fc.manual', d: 'fc.manualSub' },
      { id: 'file', icon: FileText, t: 'fc.aiFile', d: 'fc.aiFileSub' },
      { id: 'topic', icon: Lightbulb, t: 'fc.aiTopic', d: 'fc.aiTopicSub' },
      { id: 'import', icon: Download, t: 'fc.import', d: 'fc.importSub' },
    ];
    return (
      <Screen title={t('fc.create')} back>
        <Txt size="h2" bold center style={{ marginVertical: 8 }}>{t('fc.how')}</Txt>
        <Row wrap gap={12} style={{ alignItems: 'stretch' }}>
          {METHODS.map((m) => (
            <Card key={m.id} style={{ width: '47.5%', alignItems: 'center', gap: 8 }} onPress={() => { setMethod(m.id); setCards(m.id === 'manual' ? [{ front: '', back: '' }] : []); }}>
              <IconTile icon={m.icon} />
              <Txt bold center>{t(m.t)}</Txt>
              <Txt size="xs" color="text2" center>{t(m.d)}</Txt>
            </Card>
          ))}
        </Row>
      </Screen>
    );
  }

  const analysed = (materials.data?.materials || []).filter((m) => m.hasAnalysis);
  const setCard = (i, patch) => setCards(cards.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <Screen title={t('fc.create')} back>
      <Button variant="ghost" size="sm" icon={ArrowLeft} onPress={() => setMethod(null)}>Choose different method</Button>

      <Card style={{ gap: 14 }}>
        <Txt size="lg" bold>Basic Information</Txt>
        <TextInput label="Title *" placeholder="e.g. French Revolution Key Terms" value={info.title} onChangeText={(v) => setInfo({ ...info, title: v })} maxLength={150} />
        <TextArea label="Description" placeholder="What's this set about?" value={info.description} onChangeText={(v) => setInfo({ ...info, description: v })} />
        <Field label="Subject *">
          <Row wrap gap={8}>{subjects.slice(0, 12).map((s) => <Chip key={s} label={s} selected={info.subject === s} onPress={() => setInfo({ ...info, subject: s })} />)}</Row>
        </Field>
        <Field label="Tags">
          <Row>
            <View style={{ flex: 1 }}><TextInput placeholder="Add tags..." value={tagInput} onChangeText={setTagInput} onSubmitEditing={addTag} maxLength={30} /></View>
            <IconButton icon={Plus} bg={colors.primary} color="#fff" onPress={addTag} label="Add tag" />
          </Row>
          {tags.length > 0 ? <Row wrap gap={8}>{tags.map((tg) => <Chip key={tg} label={`#${tg}  ✕`} onPress={() => setTags(tags.filter((x) => x !== tg))} />)}</Row> : null}
        </Field>
      </Card>

      {method === 'manual' ? (
        <Card style={{ gap: 12 }}>
          <Txt size="lg" bold>{t('fc.uploadContent')}</Txt>
          <Row wrap gap={10} style={{ alignItems: 'stretch' }}>
            {[
              { k: 'document', icon: FileText, label: t('fc.document') },
              { k: 'image', icon: ImageIcon, label: t('fc.image') },
              { k: 'video', icon: Video, label: t('fc.video') },
              { k: 'library', icon: FolderOpen, label: t('fc.fromLibrary') },
            ].map((o) => (
              <Pressable key={o.k} disabled={Boolean(uploadStep)} onPress={() => (o.k === 'library' ? setMethod('file') : uploadAndGenerate(o.k))} style={{ width: '47.5%', alignItems: 'center', gap: 6, paddingVertical: 16, borderRadius: 16, backgroundColor: colors.surface2, opacity: uploadStep ? 0.5 : 1 }}>
                <IconTile icon={o.icon} size={40} />
                <Txt size="sm" bold>{o.label}</Txt>
              </Pressable>
            ))}
          </Row>
          {uploadStep ? <Row><Spinner /><Txt size="sm" color="text2" style={{ flex: 1 }}>{uploadName}: {uploadStep === 'uploading' ? 'uploading…' : uploadStep === 'analysing' ? 'AI is reading the file…' : 'creating flashcards…'}</Txt></Row> : null}
        </Card>
      ) : null}

      {method === 'file' || method === 'topic' ? (
        <Card style={{ gap: 14 }}>
          <Txt size="lg" bold>{method === 'file' ? t('fc.aiFile') : t('fc.aiTopic')}</Txt>
          <AiNotice />
          {method === 'file' ? (
            analysed.length
              ? <Select label="Material" value={materialId} onChange={setMaterialId} placeholder="Choose an analysed material" options={analysed.map((m) => ({ value: String(m.id), label: m.filename }))} />
              : <Alert type="info">No analysed materials yet. Upload a file and let the AI analyse it first.</Alert>
          ) : <TextInput label="Topic" placeholder="e.g. Cell structure and organelles" value={topic} onChangeText={setTopic} maxLength={200} />}
          <Select label="Number of cards" value={count} onChange={setCount} options={['6', '12', '20', '30']} />
          <Button icon={Sparkles} loading={generating} disabled={method === 'file' ? !materialId : topic.trim().length < 2} onPress={generate}>Generate cards</Button>
        </Card>
      ) : null}

      {method === 'import' ? (
        <Card style={{ gap: 14 }}>
          <Txt size="lg" bold>{t('fc.import')}</Txt>
          <TextArea label="Paste your cards (one per line: front, back - or tab-separated from Quizlet / Anki)" value={importText} onChangeText={setImportText} placeholder={'Mitochondria, Powerhouse of the cell\nOsmosis, Movement of water across a membrane'} />
          <Button variant="secondary" icon={Download} onPress={doImport} disabled={!importText.trim()}>Import cards</Button>
        </Card>
      ) : null}

      {method === 'manual' || cards.length > 0 ? (
        <Card style={{ gap: 12 }}>
          <Row between>
            <Txt size="lg" bold>Cards ({cards.filter((c) => c.front && c.back).length})</Txt>
            <Button size="sm" variant="soft" icon={Plus} onPress={() => setCards([...cards, { front: '', back: '' }])}>Add card</Button>
          </Row>
          {cards.map((c, i) => (
            <View key={i} style={{ gap: 8, padding: 10, borderRadius: 14, backgroundColor: colors.surface2 }}>
              <Row>
                <View style={{ flex: 1, gap: 8 }}>
                  <TextInput placeholder={`Front ${i + 1}`} value={c.front} onChangeText={(v) => setCard(i, { front: v })} />
                  <TextInput placeholder="Back" value={c.back} onChangeText={(v) => setCard(i, { back: v })} />
                </View>
                <IconButton icon={Trash2} bg="transparent" color={colors.danger} onPress={() => setCards(cards.filter((_, j) => j !== i))} label={`Remove card ${i + 1}`} />
              </Row>
            </View>
          ))}
        </Card>
      ) : null}

      {error ? <Alert>{error}</Alert> : null}
      <Button block loading={saving} onPress={save}>{t('common.save')}</Button>
    </Screen>
  );
}

/* ---------------------------------------------------------------- deck */
export function DeckScreen() {
  const { id } = useRoute().params;
  const { t } = useI18n();
  const toast = useToast();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const data = useApi(() => flashcardApi.deck(id), [id]);
  const [draft, setDraft] = useState({ front: '', back: '' });
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => navigation.addListener('focus', () => data.reload({ silent: true })), [navigation]); // eslint-disable-line react-hooks/exhaustive-deps

  if (data.loading && !data.data) return <Screen title="Flashcards" back><SkeletonList count={4} height={70} /></Screen>;
  if (data.error && !data.data) return <Screen title="Flashcards" back><ErrorState message={data.error} onRetry={data.reload} /></Screen>;
  const { deck, cards } = data.data;

  const add = async () => {
    try {
      await flashcardApi.addCard(deck.id, draft);
      setDraft({ front: '', back: '' });
      data.reload({ silent: true });
    } catch (err) { toast.error(getErrorMessage(err)); }
  };
  const saveEdit = async () => {
    try {
      await flashcardApi.updateCard(editing.id, editing);
      setEditing(null);
      data.reload({ silent: true });
    } catch (err) { toast.error(getErrorMessage(err)); }
  };
  const removeCard = async (cardId) => {
    try { await flashcardApi.removeCard(cardId); data.reload({ silent: true }); } catch (err) { toast.error(getErrorMessage(err)); }
  };
  const removeDeck = async () => {
    setDeleting(true);
    try {
      await flashcardApi.removeDeck(deck.id);
      toast.success('Flashcard set deleted');
      navigation.navigate('Flashcards');
    } catch (err) {
      toast.error(getErrorMessage(err));
      setDeleting(false);
    }
  };

  return (
    <Screen title={deck.title} back="Flashcards" actions={<IconButton icon={Trash2} color={colors.danger} onPress={() => setConfirmDelete(true)} label="Delete set" />}>
      <Card style={{ gap: 12 }}>
        <Row wrap gap={6}>
          <Badge>{deck.subject}</Badge>
          {deck.tags.map((tg) => <Badge key={tg} tone="muted">#{tg}</Badge>)}
        </Row>
        {deck.description ? <Txt size="sm" color="text2">{deck.description}</Txt> : null}
        <Row style={{ justifyContent: 'space-around' }}>
          {[[deck.cardCount, t('fc.cards')], [deck.dueCount, t('fc.due')], [`${deck.mastery}%`, t('fc.mastered')]].map(([v, l]) => <View key={l} style={{ alignItems: 'center' }}><Txt size="h2" bold>{v}</Txt><Txt size="xs" color="muted">{l}</Txt></View>)}
        </Row>
        <ProgressBar thin value={deck.mastery} />
        <Button block icon={Play} disabled={!deck.cardCount} onPress={() => navigation.navigate('FlashcardStudy', { id: deck.id })}>{t('fc.study')} {deck.dueCount ? `(${deck.dueCount} ${t('fc.due')})` : ''}</Button>
      </Card>

      <SectionHeader title={`${t('fc.cards').charAt(0).toUpperCase()}${t('fc.cards').slice(1)} (${cards.length})`} />
      <Card style={{ gap: 8 }}>
        <TextInput placeholder="Front" value={draft.front} onChangeText={(v) => setDraft({ ...draft, front: v })} />
        <TextInput placeholder="Back" value={draft.back} onChangeText={(v) => setDraft({ ...draft, back: v })} />
        <Button variant="soft" icon={Plus} disabled={!draft.front.trim() || !draft.back.trim()} onPress={add}>Add card</Button>
      </Card>

      <Card padded={false}>
        {cards.map((c, i) => (editing?.id === c.id ? (
          <View key={c.id} style={{ padding: 12, gap: 8, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
            <TextInput value={editing.front} onChangeText={(v) => setEditing({ ...editing, front: v })} />
            <TextInput value={editing.back} onChangeText={(v) => setEditing({ ...editing, back: v })} />
            <Row><Button size="sm" icon={Check} onPress={saveEdit}>Save</Button><Button size="sm" variant="ghost" icon={X} onPress={() => setEditing(null)}>Cancel</Button></Row>
          </View>
        ) : (
          <View key={c.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt size="sm" bold>{c.front}</Txt>
              <Txt size="sm" color="text2">{c.back}</Txt>
              <Txt size="xs" color="muted" style={{ marginTop: 4 }}>{c.interval >= 7 ? `✅ ${t('fc.mastered')}` : c.reviewedAt ? `Next review in ${c.interval || '<1'} day(s)` : 'New'}</Txt>
            </View>
            <IconButton icon={Pencil} size={34} bg="transparent" onPress={() => setEditing({ id: c.id, front: c.front, back: c.back })} label="Edit card" />
            <IconButton icon={Trash2} size={34} bg="transparent" color={colors.danger} onPress={() => removeCard(c.id)} label="Delete card" />
          </View>
        )))}
        {!cards.length ? <Txt size="sm" color="text2" center style={{ padding: 16 }}>No cards yet - add one above.</Txt> : null}
      </Card>

      <ConfirmDialog open={confirmDelete} title="Delete this set?" message={`"${deck.title}" and all its cards will be deleted.`} loading={deleting} onConfirm={removeDeck} onCancel={() => setConfirmDelete(false)} />
    </Screen>
  );
}

/* ---------------------------------------------------------------- study */
export function FlashcardStudyScreen() {
  const { id } = useRoute().params;
  const { t } = useI18n();
  const toast = useToast();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [deck, setDeck] = useState(null);
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [stats, setStats] = useState({ again: 0, known: 0 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setError('');
    try {
      const res = await flashcardApi.deck(id);
      const now = new Date().toISOString();
      const due = res.cards.filter((c) => c.dueAt <= now);
      setQueue((due.length ? due : res.cards).slice(0, 30));
      setDeck(res.deck);
      setIndex(0);
      setFlipped(false);
      setStats({ again: 0, known: 0 });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const grade = async (g) => {
    const card = queue[index];
    if (!card || busy) return;
    setBusy(true);
    try {
      await flashcardApi.review(card, g);
      setStats((s) => (g === 0 ? { ...s, again: s.again + 1 } : { ...s, known: s.known + 1 }));
      if (g === 0) setQueue((q) => [...q, card]);
      setFlipped(false);
      setIndex((i) => i + 1);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (error) return <Screen title="Study" back><ErrorState message={error} onRetry={load} /></Screen>;
  if (!deck) return <Screen title="Study" back><PageLoader /></Screen>;

  const card = queue[index];
  const done = index >= queue.length;

  return (
    <Screen title={deck.title} back>
      {done ? (
        <Card style={{ alignItems: 'center', gap: 10, padding: 24 }}>
          <IconTile icon={PartyPopper} size={64} />
          <Txt size="h2" bold>{t('fc.sessionDone')}</Txt>
          <Txt color="text2">{stats.known} known · {stats.again} to review again</Txt>
          <Row><Button icon={RotateCcw} onPress={load}>{t('games.playAgain')}</Button><Button variant="secondary" onPress={() => navigation.goBack()}>{t('common.done')}</Button></Row>
        </Card>
      ) : (
        <View style={{ gap: 14 }}>
          <Row between><Txt size="sm" color="text2">{index + 1} / {queue.length}</Txt><Txt size="sm" color="text2">{stats.known} ✓ · {stats.again} ↺</Txt></Row>
          <ProgressBar thin value={(index / queue.length) * 100} />
          <Pressable onPress={() => setFlipped((f) => !f)} accessibilityLabel={flipped ? card.back : card.front}
            style={{ minHeight: 280, borderRadius: 26, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: flipped ? colors.primary : colors.surface, borderWidth: 1, borderColor: flipped ? colors.primary : colors.border }}>
            <Txt size="h2" bold center color={flipped ? '#fff' : 'text'}>{flipped ? card.back : card.front}</Txt>
            {!flipped ? <Txt size="sm" color="muted">{t('fc.tapFlip')}</Txt> : null}
          </Pressable>
          {flipped ? (
            <Row gap={8} style={{ alignItems: 'stretch' }}>
              {[[0, t('fc.again'), '<1m', 'danger'], [1, t('fc.hard'), card.repetitions ? '3d' : '1d', 'secondary'], [2, t('fc.good'), card.repetitions ? `${Math.max(6, card.interval * 2)}d` : '1d', 'soft'], [3, t('fc.easy'), card.repetitions ? `${Math.max(8, card.interval * 3)}d` : '3d', 'primary']].map(([g, label, sub, variant]) => (
                <View key={g} style={{ flex: 1 }}>
                  <Button block variant={variant} size="sm" disabled={busy} onPress={() => grade(g)}>{label}</Button>
                  <Txt size="xs" color="muted" center style={{ marginTop: 4 }}>{sub}</Txt>
                </View>
              ))}
            </Row>
          ) : <Button block variant="secondary" onPress={() => setFlipped(true)}>Show answer</Button>}
        </View>
      )}
    </Screen>
  );
}
