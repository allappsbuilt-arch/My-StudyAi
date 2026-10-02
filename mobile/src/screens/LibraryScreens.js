/** Notes (search, create, view, edit, delete), study Materials list, and Upload. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Calendar, CheckCircle2, CloudUpload, ExternalLink, Eye, File, FileImage, FileText, FileVideo, FolderOpen, NotebookPen, Pencil, Plus, RotateCcw, Sparkles, Trash2, Upload, X } from 'lucide-react-native';
import { getErrorMessage, materialApi, notesApi } from '../services/api';
import { useApi } from '../hooks/useApi';
import { useDebounce } from '../hooks/useDebounce';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Screen, { SectionHeader } from '../components/Screen';
import { Alert, Badge, Button, Card, Chip, ConfirmDialog, EmptyState, ErrorState, IconButton, IconTile, ProgressBar, Row, SearchBar, Select, Sheet, SkeletonList, TextArea, TextInput, Txt } from '../components/Ui';
import { AiNotice, FileTypeIcon, Markdown, fileTypeLabel } from '../components/Misc';
import { ACCEPTED_FILES, SUBJECTS } from '../utils/constants';
import { formatBytes, formatDate, timeAgo } from '../utils/format';
import { extOf, pickDocument, pickImage } from '../utils/files';

/* ---------------------------------------------------------------- notes */
const EMPTY = { title: '', subject: '', content: '' };

export function NotesScreen() {
  const toast = useToast();
  const { user } = useAuth();
  const { colors } = useTheme();
  const route = useRoute();
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const debounced = useDebounce(search);

  const { data, loading, error, reload, setData } = useApi(() => notesApi.list({ search: debounced || undefined }), [debounced]);
  const allNotes = data?.notes || [];
  const notes = subject ? allNotes.filter((n) => n.subject === subject) : allNotes;
  const subjects = useMemo(() => [...new Set(allNotes.map((n) => n.subject).filter(Boolean))], [allNotes]);

  const [editor, setEditor] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Open a note passed from another screen (e.g. after "Save Notes" on a summary)
  const openId = route.params?.openNoteId;
  useEffect(() => {
    if (!openId) return;
    notesApi.get(openId).then((r) => setViewing(r.note)).catch(() => {});
  }, [openId]);

  const openCreate = () => { setFormErrors({}); setSaveError(''); setEditor({ ...EMPTY }); };
  const openEdit = (note) => { setFormErrors({}); setSaveError(''); setViewing(null); setEditor({ id: note.id, title: note.title, subject: note.subject || '', content: note.content }); };

  const save = async () => {
    const errs = {};
    if (!editor.title.trim()) errs.title = 'Give your note a title.';
    if (!editor.content.trim()) errs.content = 'Write something in your note.';
    setFormErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setSaveError('');
    try {
      const body = { title: editor.title.trim(), subject: editor.subject.trim(), content: editor.content };
      if (editor.id) {
        const res = await notesApi.update(editor.id, body);
        setData((d) => ({ ...d, notes: [res.note, ...d.notes.filter((n) => n.id !== editor.id)] }));
        toast.success('Note updated');
      } else {
        const res = await notesApi.create(body);
        setData((d) => ({ ...d, notes: [res.note, ...(d?.notes || [])] }));
        toast.success('Note created');
      }
      setEditor(null);
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await notesApi.remove(toDelete.id);
      setData((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== toDelete.id) }));
      toast.success('Note deleted');
      setToDelete(null);
      setViewing(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const subjectOptions = [...new Set([...(user?.preferences?.subjects || []), ...subjects, ...SUBJECTS])];

  return (
    <Screen eyebrow="Organise" title="My Notes" back actions={<Button size="sm" icon={Plus} onPress={openCreate}>Create Note</Button>}>
      <SearchBar value={search} onChange={setSearch} placeholder="Search notes..." />
      {subjects.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
          <Chip label="All" selected={!subject} onPress={() => setSubject('')} />
          {subjects.map((s) => <Chip key={s} label={s} selected={subject === s} onPress={() => setSubject(s)} />)}
        </ScrollView>
      ) : null}

      {loading && !data ? <SkeletonList count={4} height={110} /> : error && !data ? <ErrorState message={error} onRetry={reload} /> : notes.length === 0 ? (
        <EmptyState icon={NotebookPen} title={search || subject ? 'No matching notes' : 'No notes yet'} message={search || subject ? 'Try a different search.' : 'Create your first note, or save an AI summary as a note.'} action={!search && !subject ? <Button icon={Plus} onPress={openCreate}>Create Note</Button> : null} />
      ) : notes.map((n) => (
        <Card key={n.id} onPress={() => setViewing(n)} style={{ gap: 8 }}>
          <Row between>
            {n.subject ? <Badge>{n.subject}</Badge> : <Badge tone="muted">General</Badge>}
            <Row gap={0}>
              <IconButton icon={Pencil} size={34} bg="transparent" onPress={() => openEdit(n)} label="Edit note" />
              <IconButton icon={Trash2} size={34} bg="transparent" color={colors.danger} onPress={() => setToDelete(n)} label="Delete note" />
            </Row>
          </Row>
          <Txt size="lg" bold numberOfLines={2}>{n.title}</Txt>
          <Txt size="sm" color="text2" numberOfLines={3}>{n.content.replace(/[#*_>`-]/g, '').trim()}</Txt>
          <Row gap={5}><Calendar size={12} color={colors.muted} /><Txt size="xs" color="muted">{formatDate(n.createdAt)} · edited {timeAgo(n.updatedAt)}</Txt></Row>
        </Card>
      ))}

      <Sheet open={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing?.title} footer={viewing ? <><Button variant="danger" size="sm" icon={Trash2} onPress={() => setToDelete(viewing)}>Delete</Button><Button size="sm" icon={Pencil} onPress={() => openEdit(viewing)}>Edit</Button></> : null}>
        {viewing ? (
          <ScrollView style={{ maxHeight: 420 }}>
            <Row wrap gap={8} style={{ marginBottom: 12 }}>
              <Badge>{viewing.subject || 'General'}</Badge>
              <Txt size="xs" color="muted">Created {formatDate(viewing.createdAt)} · Updated {timeAgo(viewing.updatedAt)}</Txt>
            </Row>
            <Markdown>{viewing.content}</Markdown>
          </ScrollView>
        ) : null}
      </Sheet>

      <Sheet open={Boolean(editor)} onClose={() => !saving && setEditor(null)} title={editor?.id ? 'Edit Note' : 'Create Note'} footer={<><Button variant="secondary" onPress={() => setEditor(null)} disabled={saving}>Cancel</Button><Button onPress={save} loading={saving}>{editor?.id ? 'Save changes' : 'Create'}</Button></>}>
        {editor ? (
          <ScrollView style={{ maxHeight: 440 }} contentContainerStyle={{ gap: 14 }} keyboardShouldPersistTaps="handled">
            {saveError ? <Alert>{saveError}</Alert> : null}
            <TextInput label="Title" value={editor.title} onChangeText={(v) => setEditor({ ...editor, title: v })} error={formErrors.title} maxLength={200} placeholder="e.g. Cell structure" />
            <Select label="Subject" value={editor.subject} onChange={(v) => setEditor({ ...editor, subject: v })} options={subjectOptions} placeholder="e.g. Biology" />
            <TextArea label="Content" value={editor.content} onChangeText={(v) => setEditor({ ...editor, content: v })} error={formErrors.content} hint="Tip: Markdown works - use **bold**, - lists and ## headings." placeholder="Write your note..." inputStyle={{ minHeight: 180 }} />
          </ScrollView>
        ) : null}
      </Sheet>

      <ConfirmDialog open={Boolean(toDelete)} title="Delete note?" message={`"${toDelete?.title}" will be permanently deleted.`} loading={deleting} onConfirm={confirmDelete} onCancel={() => setToDelete(null)} />
    </Screen>
  );
}

/* ---------------------------------------------------------------- materials */
const FILTERS = [
  { value: '', label: 'All' }, { value: 'pdf', label: 'PDF' }, { value: 'document', label: 'Documents' }, { value: 'image', label: 'Images' }, { value: 'video', label: 'Videos' },
];

function StatusBadge({ m }) {
  if (m.analysisStatus === 'completed') return <Badge tone="success">Analysed</Badge>;
  if (m.analysisStatus === 'extracting' || m.analysisStatus === 'analyzing') return <Badge>Analysing…</Badge>;
  if (m.analysisStatus === 'failed') return <Badge tone="danger">Failed</Badge>;
  return <Badge tone="muted">Not analysed</Badge>;
}

export function MaterialsScreen() {
  const navigation = useNavigation();
  const toast = useToast();
  const { colors } = useTheme();
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { data, loading, error, reload, setData } = useApi(() => materialApi.list({ type: type || undefined, search: debounced || undefined }), [type, debounced]);
  const materials = data?.materials || [];
  useEffect(() => navigation.addListener('focus', () => reload({ silent: true })), [navigation]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await materialApi.remove(toDelete.id);
      setData((d) => ({ ...d, materials: d.materials.filter((m) => m.id !== toDelete.id) }));
      toast.success('Material deleted');
      setToDelete(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const openFile = async (m) => { try { await materialApi.open(m.id); } catch (err) { toast.error(getErrorMessage(err)); } };
  const openMaterial = (m) => navigation.navigate(m.analysisStatus === 'completed' ? 'Summary' : 'Analysis', { id: m.id });

  return (
    <Screen eyebrow="Library" title="Study Materials" back actions={<Button size="sm" icon={Upload} onPress={() => navigation.navigate('Upload')}>Upload</Button>}>
      <SearchBar value={search} onChange={setSearch} placeholder="Search materials..." />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
        {FILTERS.map((f) => <Chip key={f.value} label={f.label} selected={type === f.value} onPress={() => setType(f.value)} />)}
      </ScrollView>

      <SectionHeader title="Recent uploads" action={!loading ? `${materials.length} files` : undefined} />

      {loading && !data ? <SkeletonList count={4} /> : error && !data ? <ErrorState message={error} onRetry={reload} /> : materials.length === 0 ? (
        <EmptyState icon={FolderOpen} title={search || type ? 'No matching materials' : 'No materials yet'} message={search || type ? 'Try a different search or filter.' : 'Upload a PDF, video, image or document and let AI turn it into a study guide.'} action={!search && !type ? <Button icon={Upload} onPress={() => navigation.navigate('Upload')}>Upload Material</Button> : null} />
      ) : materials.map((m) => (
        <Card key={m.id} style={{ gap: 12 }}>
          <Row>
            <FileTypeIcon type={m.fileType} />
            <Pressable onPress={() => openMaterial(m)} style={{ flex: 1 }}>
              <Txt bold numberOfLines={1}>{m.filename}</Txt>
              <Txt size="xs" color="muted">{fileTypeLabel(m.fileType)} · {formatBytes(m.fileSize)} · {formatDate(m.uploadedAt)}{m.subject ? ` · ${m.subject}` : ''}</Txt>
            </Pressable>
            <IconButton icon={Trash2} size={34} bg="transparent" color={colors.danger} onPress={() => setToDelete(m)} label={`Delete ${m.filename}`} />
          </Row>
          <Row between>
            <StatusBadge m={m} />
            <Row gap={6}>
              <Button variant="ghost" size="sm" icon={ExternalLink} onPress={() => openFile(m)}>Open</Button>
              {m.analysisStatus === 'completed'
                ? <Button variant="soft" size="sm" icon={Eye} onPress={() => openMaterial(m)}>Summary</Button>
                : <Button variant="soft" size="sm" icon={Sparkles} onPress={() => openMaterial(m)}>{m.analysisStatus === 'failed' ? 'Retry' : 'Analyse'}</Button>}
            </Row>
          </Row>
        </Card>
      ))}

      <ConfirmDialog open={Boolean(toDelete)} title="Delete material?" message={`"${toDelete?.filename}" and its AI analysis will be permanently deleted.`} loading={deleting} onConfirm={confirmDelete} onCancel={() => setToDelete(null)} />
    </Screen>
  );
}

/* ---------------------------------------------------------------- upload */
function typeOf(file) {
  const ext = extOf(file.name);
  if (ext === 'pdf') return 'pdf';
  if (ext === 'mp4') return 'video';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'image';
  return 'document';
}

function validate(file) {
  const ext = file.name.includes('.') ? extOf(file.name) : '';
  if (!ACCEPTED_FILES.extensions.includes(ext)) return 'Unsupported file type. Please upload a PDF, MP4, DOCX, TXT or image file.';
  if (file.size > ACCEPTED_FILES.maxSizeMB * 1024 * 1024) return `This file is ${formatBytes(file.size)}. The maximum size is ${ACCEPTED_FILES.maxSizeMB} MB.`;
  return null;
}

export function UploadScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { colors } = useTheme();
  const abortRef = useRef(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');
  const [material, setMaterial] = useState(null);

  const subjects = [...new Set([...(user?.preferences?.subjects || []), ...SUBJECTS])];

  const pick = async (kind) => {
    try {
      const f = kind === 'image' ? await pickImage() : await pickDocument();
      if (!f) return;
      const problem = f.size ? validate(f) : validate({ ...f, size: 1 });
      setError(problem || '');
      setFile(problem ? null : f);
      setStatus('idle');
      setProgress(0);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const upload = async () => {
    if (!file) return;
    setError('');
    setStatus('uploading');
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await materialApi.upload(file, { subject, description }, setProgress, controller.signal);
      setMaterial(res.material);
      setProgress(100);
      setStatus('done');
    } catch (err) {
      setStatus('idle');
      setProgress(0);
      if (err.code !== 'ERR_CANCELED') setError(getErrorMessage(err));
    }
  };

  const reset = () => { setFile(null); setMaterial(null); setStatus('idle'); setProgress(0); setDescription(''); };
  const fileType = file ? typeOf(file) : null;

  return (
    <Screen eyebrow="Materials" title="Upload Material" back>
      {status !== 'done' ? (
        <>
          <Card style={{ alignItems: 'center', gap: 10, padding: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: colors.primary + '66' }}>
            <IconTile icon={CloudUpload} size={64} color="#fff" bg={colors.primary} />
            <Txt size="h2" bold center>Upload your study material</Txt>
            <Txt size="sm" color="text2" center>Choose a file from your phone</Txt>
            <Row wrap gap={6} style={{ justifyContent: 'center' }}>
              {[['PDF', FileText], ['MP4', FileVideo], ['DOCX', File], ['TXT', File], ['Images', FileImage]].map(([l, I]) => <Badge key={l} tone="muted"><I size={11} /> {l}</Badge>)}
            </Row>
            <Row style={{ marginTop: 4 }}>
              <Button icon={File} onPress={() => pick('file')} disabled={status === 'uploading'}>Choose file</Button>
              <Button variant="secondary" icon={FileImage} onPress={() => pick('image')} disabled={status === 'uploading'}>Photo</Button>
            </Row>
            <Txt size="xs" color="muted">Maximum file size {ACCEPTED_FILES.maxSizeMB} MB</Txt>
          </Card>

          {error ? <Alert>{error}</Alert> : null}

          {file ? (
            <Card style={{ gap: 16 }}>
              <Row>
                <FileTypeIcon type={fileType} />
                <View style={{ flex: 1 }}>
                  <Txt bold numberOfLines={1}>{file.name}</Txt>
                  <Txt size="xs" color="muted">{formatBytes(file.size)}</Txt>
                </View>
                {status === 'idle' ? <IconButton icon={X} size={34} bg="transparent" onPress={reset} label="Remove file" /> : null}
              </Row>
              {status === 'uploading' ? (
                <View style={{ gap: 8 }}>
                  <Row between><Txt size="sm" color="text2">Uploading…</Txt><Txt size="sm" bold>{progress}%</Txt></Row>
                  <ProgressBar value={progress} />
                  <Button variant="ghost" size="sm" onPress={() => abortRef.current?.abort()} style={{ alignSelf: 'flex-end' }}>Cancel</Button>
                </View>
              ) : (
                <View style={{ gap: 14 }}>
                  <Select label="Subject (optional)" value={subject} onChange={setSubject} options={subjects} placeholder="Let AI detect the subject" />
                  <TextArea label={fileType === 'video' ? 'Video description or transcript (recommended)' : 'Notes for the AI (optional)'} hint={fileType === 'video' ? 'AI looks at frames from the video; adding what is said helps it summarise accurately.' : 'e.g. "Focus on chapter 3" or "I have an exam on this next week".'} value={description} onChangeText={setDescription} maxLength={20000} />
                  <Button block icon={CloudUpload} onPress={upload}>Upload file</Button>
                </View>
              )}
            </Card>
          ) : null}
        </>
      ) : null}

      {status === 'done' && material ? (
        <Card style={{ alignItems: 'center', gap: 12, padding: 22 }}>
          <IconTile icon={CheckCircle2} size={64} color={colors.success} bg={colors.successSoft} />
          <Txt size="h2" bold>Upload successful!</Txt>
          <Txt size="sm" color="text2" center>Your file is safely stored. Let AI turn it into a study guide.</Txt>
          <View style={{ alignSelf: 'stretch', backgroundColor: colors.surface2, borderRadius: 16, padding: 12, gap: 10 }}>
            <Row>
              <FileTypeIcon type={material.fileType} />
              <View style={{ flex: 1 }}>
                <Txt bold numberOfLines={1}>{material.filename}</Txt>
                <Txt size="xs" color="muted">{formatBytes(material.fileSize)} · 100% uploaded</Txt>
              </View>
              <CheckCircle2 size={20} color={colors.success} />
            </Row>
            <ProgressBar value={100} thin />
          </View>
          <AiNotice />
          <Button block icon={Sparkles} onPress={() => navigation.navigate('Analysis', { id: material.id, autoStart: true })}>START AI ANALYSIS</Button>
          <Button block variant="secondary" icon={RotateCcw} onPress={reset}>Upload another file</Button>
        </Card>
      ) : null}
    </Screen>
  );
}
