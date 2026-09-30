/** 11. Notes - search, create, view, edit, delete. */
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Search, NotebookPen, Pencil, Trash2, Calendar } from 'lucide-react';
import { notesApi, getErrorMessage } from '../services/api';
import { useApi } from '../hooks/useApi';
import { useDebounce } from '../hooks/useDebounce';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Page } from '../navigation/AppLayout';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Modal, { ConfirmDialog } from '../components/Modal';
import Markdown from '../components/Markdown';
import { SearchBar, TextInput, TextArea } from '../components/FormFields';
import { EmptyState, ErrorState, SkeletonList, Alert } from '../components/Feedback';
import { formatDate, timeAgo } from '../utils/format';
import { SUBJECTS } from '../utils/constants';

const EMPTY = { title: '', subject: '', content: '' };

export default function NotesScreen() {
  const toast = useToast();
  const { user } = useAuth();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const debounced = useDebounce(search);

  const { data, loading, error, reload, setData } = useApi(() => notesApi.list({ search: debounced || undefined }), [debounced]);
  const allNotes = data?.notes || [];
  const notes = subject ? allNotes.filter((n) => n.subject === subject) : allNotes;
  const subjects = useMemo(() => [...new Set(allNotes.map((n) => n.subject).filter(Boolean))], [allNotes]);

  const [editor, setEditor] = useState(null); // { id?, title, subject, content }
  const [formErrors, setFormErrors] = useState({});
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Open a note passed from another screen (e.g. after "Save Notes" on a summary)
  useEffect(() => {
    const id = location.state?.openNoteId;
    if (!id) return;
    notesApi.get(id).then((r) => setViewing(r.note)).catch(() => {});
  }, [location.state]);

  const openCreate = () => {
    setFormErrors({});
    setSaveError('');
    setEditor({ ...EMPTY });
  };
  const openEdit = (note) => {
    setFormErrors({});
    setSaveError('');
    setViewing(null);
    setEditor({ id: note.id, title: note.title, subject: note.subject || '', content: note.content });
  };

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
    <Page wide>
      <PageHeader
        back="/study"
        eyebrow="Organise"
        title="My Notes"
        actions={
          <Button size="sm" icon={<Plus size={16} />} onClick={openCreate}>
            Create Note
          </Button>
        }
      />

      <SearchBar value={search} onChange={setSearch} placeholder="Search notes..." icon={Search} />
      {subjects.length > 0 && (
        <div className="chips" style={{ marginTop: 14 }}>
          <button className={`chip ${!subject ? 'active' : ''}`} onClick={() => setSubject('')}>All</button>
          {subjects.map((s) => (
            <button key={s} className={`chip ${subject === s ? 'active' : ''}`} onClick={() => setSubject(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        {loading ? (
          <SkeletonList count={4} height={110} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : notes.length === 0 ? (
          <EmptyState
            icon={NotebookPen}
            title={search || subject ? 'No matching notes' : 'No notes yet'}
            message={search || subject ? 'Try a different search.' : 'Create your first note, or save an AI summary as a note.'}
            action={!search && !subject && <Button icon={<Plus size={18} />} onClick={openCreate}>Create Note</Button>}
          />
        ) : (
          <div className="notes-grid">
            {notes.map((n) => (
              <div key={n.id} className="card clickable note-card fade-in" onClick={() => setViewing(n)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setViewing(n)}>
                <div className="row-between">
                  {n.subject ? <span className="badge">{n.subject}</span> : <span className="badge neutral">General</span>}
                  <div className="row" style={{ gap: 2 }}>
                    <button className="icon-btn plain sm" onClick={(e) => { e.stopPropagation(); openEdit(n); }} aria-label="Edit note">
                      <Pencil size={16} />
                    </button>
                    <button className="icon-btn plain sm" onClick={(e) => { e.stopPropagation(); setToDelete(n); }} aria-label="Delete note">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h3 className="clamp-2">{n.title}</h3>
                <div className="preview clamp-3">{n.content.replace(/[#*_>`-]/g, '').trim()}</div>
                <div className="tiny muted row" style={{ gap: 5, marginTop: 'auto' }}>
                  <Calendar size={12} /> {formatDate(n.createdAt)} · edited {timeAgo(n.updatedAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View */}
      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing?.title}
        footer={
          viewing && (
            <>
              <Button variant="danger-soft" icon={<Trash2 size={16} />} onClick={() => setToDelete(viewing)}>
                Delete
              </Button>
              <Button icon={<Pencil size={16} />} onClick={() => openEdit(viewing)}>
                Edit
              </Button>
            </>
          )
        }
      >
        {viewing && (
          <>
            <div className="row wrap" style={{ gap: 8, marginBottom: 14 }}>
              <span className="badge">{viewing.subject || 'General'}</span>
              <span className="tiny muted">Created {formatDate(viewing.createdAt)} · Updated {timeAgo(viewing.updatedAt)}</span>
            </div>
            <Markdown>{viewing.content}</Markdown>
          </>
        )}
      </Modal>

      {/* Create / edit */}
      <Modal
        open={Boolean(editor)}
        onClose={() => !saving && setEditor(null)}
        title={editor?.id ? 'Edit Note' : 'Create Note'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditor(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              {editor?.id ? 'Save changes' : 'Create'}
            </Button>
          </>
        }
      >
        {editor && (
          <div className="stack">
            {saveError && <Alert>{saveError}</Alert>}
            <TextInput label="Title" value={editor.title} onChange={(e) => setEditor({ ...editor, title: e.target.value })} error={formErrors.title} maxLength={200} placeholder="e.g. Cell structure" autoFocus />
            <TextInput label="Subject" value={editor.subject} onChange={(e) => setEditor({ ...editor, subject: e.target.value })} list="note-subjects" maxLength={100} placeholder="e.g. Biology" />
            <datalist id="note-subjects">
              {subjectOptions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <TextArea
              label="Content"
              value={editor.content}
              onChange={(e) => setEditor({ ...editor, content: e.target.value })}
              error={formErrors.content}
              hint="Tip: Markdown works — use **bold**, - lists and ## headings."
              style={{ minHeight: 220 }}
              placeholder="Write your note..."
            />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete note?"
        message={`“${toDelete?.title}” will be permanently deleted.`}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </Page>
  );
}
