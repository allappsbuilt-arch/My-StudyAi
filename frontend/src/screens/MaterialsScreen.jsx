/** 7. Study materials - list, filter, open, delete. */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Search, Trash2, FolderOpen, Sparkles, Eye, ExternalLink } from 'lucide-react';
import { materialApi, getErrorMessage } from '../services/api';
import { useApi } from '../hooks/useApi';
import { useDebounce } from '../hooks/useDebounce';
import { useToast } from '../context/ToastContext';
import { Page } from '../navigation/AppLayout';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { SearchBar } from '../components/FormFields';
import { EmptyState, ErrorState, SkeletonList } from '../components/Feedback';
import { ConfirmDialog } from '../components/Modal';
import FileTypeIcon, { fileTypeLabel } from '../components/FileTypeIcon';
import { formatBytes, formatDate } from '../utils/format';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'pdf', label: 'PDF' },
  { value: 'document', label: 'Documents' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' },
];

function StatusBadge({ m }) {
  if (m.analysisStatus === 'completed') return <span className="badge success">Analysed</span>;
  if (m.analysisStatus === 'extracting' || m.analysisStatus === 'analyzing') return <span className="badge">Analysing…</span>;
  if (m.analysisStatus === 'failed') return <span className="badge danger">Failed</span>;
  return <span className="badge neutral">Not analysed</span>;
}

export default function MaterialsScreen() {
  const navigate = useNavigate();
  const toast = useToast();
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { data, loading, error, reload, setData } = useApi(() => materialApi.list({ type: type || undefined, search: debounced || undefined }), [type, debounced]);
  const materials = data?.materials || [];

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

  const openFile = async (m) => {
    try {
      await materialApi.open(m.id);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const openMaterial = (m) => navigate(m.analysisStatus === 'completed' ? `/materials/${m.id}/summary` : `/materials/${m.id}/analysis`);

  return (
    <Page>
      <PageHeader
        back="/study"
        eyebrow="Library"
        title="Study Materials"
        actions={
          <Button size="sm" icon={<Upload size={16} />} onClick={() => navigate('/materials/upload')}>
            Upload
          </Button>
        }
      />

      <SearchBar value={search} onChange={setSearch} placeholder="Search materials..." icon={Search} />
      <div className="chips" style={{ marginTop: 14 }}>
        {FILTERS.map((f) => (
          <button key={f.value} className={`chip ${type === f.value ? 'active' : ''}`} onClick={() => setType(f.value)} aria-pressed={type === f.value}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="section-title">
        <h2>Recent uploads</h2>
        {!loading && <span className="count">{materials.length} files</span>}
      </div>

      {loading ? (
        <SkeletonList count={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : materials.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={search || type ? 'No matching materials' : 'No materials yet'}
          message={search || type ? 'Try a different search or filter.' : 'Upload a PDF, video, image or document and let AI turn it into a study guide.'}
          action={
            !search && !type && (
              <Button icon={<Upload size={18} />} onClick={() => navigate('/materials/upload')}>
                Upload Material
              </Button>
            )
          }
        />
      ) : (
        <div className="stack">
          {materials.map((m) => (
            <div key={m.id} className="card tight fade-in">
              <div className="file-row">
                <FileTypeIcon type={m.fileType} />
                <button className="grow" onClick={() => openMaterial(m)} style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer', color: 'inherit', font: 'inherit' }}>
                  <div className="bold truncate">{m.filename}</div>
                  <div className="tiny muted" style={{ marginTop: 2 }}>
                    {fileTypeLabel(m.fileType)} · {formatBytes(m.fileSize)} · {formatDate(m.uploadedAt)}
                    {m.subject ? ` · ${m.subject}` : ''}
                  </div>
                </button>
                <button className="icon-btn plain sm" onClick={() => setToDelete(m)} aria-label={`Delete ${m.filename}`}>
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="row-between" style={{ marginTop: 12 }}>
                <StatusBadge m={m} />
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn ghost sm" onClick={() => openFile(m)}>
                    <ExternalLink size={15} /> Open
                  </button>
                  {m.analysisStatus === 'completed' ? (
                    <button className="btn soft sm" onClick={() => openMaterial(m)}>
                      <Eye size={15} /> Summary
                    </button>
                  ) : (
                    <button className="btn soft sm" onClick={() => openMaterial(m)}>
                      <Sparkles size={15} /> {m.analysisStatus === 'failed' ? 'Retry' : 'Analyse'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete material?"
        message={`“${toDelete?.filename}” and its AI analysis will be permanently deleted.`}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </Page>
  );
}
