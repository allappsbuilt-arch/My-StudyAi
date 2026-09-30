/** 8. Upload material - drag & drop, validation, real upload progress, then START AI ANALYSIS. */
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudUpload, X, CheckCircle2, Sparkles, RotateCcw, FileText, FileVideo, FileImage, File } from 'lucide-react';
import { materialApi, getErrorMessage } from '../services/api';
import { Page } from '../navigation/AppLayout';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { ProgressBar } from '../components/Progress';
import { Alert } from '../components/Feedback';
import { Select, TextArea } from '../components/FormFields';
import FileTypeIcon from '../components/FileTypeIcon';
import AiNotice from '../components/AiNotice';
import { ACCEPTED_FILES, SUBJECTS } from '../utils/constants';
import { formatBytes } from '../utils/format';
import { useAuth } from '../context/AuthContext';

function typeOf(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'mp4') return 'video';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'image';
  return 'document';
}

function validate(file) {
  const ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
  if (!ACCEPTED_FILES.extensions.includes(ext)) return 'Unsupported file type. Please upload a PDF, MP4, DOCX, TXT or image file.';
  if (file.size > ACCEPTED_FILES.maxSizeMB * 1024 * 1024) return `This file is ${formatBytes(file.size)}. The maximum size is ${ACCEPTED_FILES.maxSizeMB} MB.`;
  if (file.size === 0) return 'This file is empty.';
  return null;
}

export default function UploadScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | uploading | done
  const [material, setMaterial] = useState(null);

  const subjects = [...new Set([...(user?.preferences?.subjects || []), ...SUBJECTS])];

  const pick = (f) => {
    if (!f) return;
    const problem = validate(f);
    setError(problem || '');
    setFile(problem ? null : f);
    setStatus('idle');
    setProgress(0);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    pick(e.dataTransfer.files?.[0]);
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

  const cancel = () => abortRef.current?.abort();

  const reset = () => {
    setFile(null);
    setMaterial(null);
    setStatus('idle');
    setProgress(0);
    setDescription('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const fileType = file ? typeOf(file) : null;

  return (
    <Page>
      <PageHeader back eyebrow="Materials" title="Upload Material" />

      {status !== 'done' && (
        <>
          <div
            className={`dropzone ${drag ? 'drag' : ''}`}
            onClick={() => status === 'idle' && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
            aria-label="Choose a file to upload"
          >
            <div className="icon-tile solid lg">
              <CloudUpload size={28} />
            </div>
            <h2>Upload your study material</h2>
            <p className="small text-2">Drag & drop a file here, or tap to browse</p>
            <div className="format-row" style={{ marginTop: 6 }}>
              {[
                { l: 'PDF', i: FileText },
                { l: 'MP4', i: FileVideo },
                { l: 'DOCX', i: File },
                { l: 'TXT', i: File },
                { l: 'Images', i: FileImage },
              ].map(({ l, i: I }) => (
                <span key={l} className="badge neutral">
                  <I size={13} /> {l}
                </span>
              ))}
            </div>
            <p className="tiny muted">Maximum file size {ACCEPTED_FILES.maxSizeMB} MB</p>
            <input ref={inputRef} type="file" accept={ACCEPTED_FILES.accept} hidden onChange={(e) => pick(e.target.files?.[0])} />
          </div>

          {error && (
            <div style={{ marginTop: 14 }}>
              <Alert>{error}</Alert>
            </div>
          )}

          {file && (
            <div className="card fade-in" style={{ marginTop: 16 }}>
              <div className="file-row">
                <FileTypeIcon type={fileType} />
                <div className="grow">
                  <div className="bold truncate">{file.name}</div>
                  <div className="tiny muted">{formatBytes(file.size)}</div>
                </div>
                {status === 'idle' && (
                  <button className="icon-btn plain sm" onClick={reset} aria-label="Remove file">
                    <X size={18} />
                  </button>
                )}
              </div>

              {status === 'uploading' ? (
                <div style={{ marginTop: 16 }}>
                  <div className="row-between small" style={{ marginBottom: 8 }}>
                    <span className="text-2">Uploading…</span>
                    <span className="bold">{progress}%</span>
                  </div>
                  <ProgressBar value={progress} label="Upload progress" />
                  <div style={{ marginTop: 12, textAlign: 'right' }}>
                    <button className="btn ghost sm" onClick={cancel}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="stack" style={{ marginTop: 16 }}>
                  <Select label="Subject (optional)" value={subject} onChange={(e) => setSubject(e.target.value)} options={subjects} placeholder="Let AI detect the subject" />
                  <TextArea
                    label={fileType === 'video' ? 'Video description or transcript (recommended)' : 'Notes for the AI (optional)'}
                    hint={fileType === 'video' ? 'AI looks at frames from the video; adding what is said helps it summarise accurately.' : 'e.g. “Focus on chapter 3” or “I have an exam on this next week”.'}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={20000}
                    style={{ minHeight: 100 }}
                  />
                  <Button size="lg" block icon={<CloudUpload size={18} />} onClick={upload}>
                    Upload file
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {status === 'done' && material && (
        <div className="card fade-in center" style={{ padding: '28px 18px' }}>
          <div className="stack" style={{ alignItems: 'center' }}>
            <div className="icon-tile success lg round">
              <CheckCircle2 size={30} />
            </div>
            <h2>Upload successful!</h2>
            <p className="text-2 small">Your file is safely stored. Let AI turn it into a study guide.</p>
          </div>
          <div className="card flat tight" style={{ marginTop: 18, textAlign: 'left' }}>
            <div className="file-row">
              <FileTypeIcon type={material.fileType} />
              <div className="grow">
                <div className="bold truncate">{material.filename}</div>
                <div className="tiny muted">{formatBytes(material.fileSize)} · 100% uploaded</div>
              </div>
              <CheckCircle2 size={20} color="var(--success)" />
            </div>
            <div style={{ marginTop: 12 }}>
              <ProgressBar value={100} thin label="Upload complete" />
            </div>
          </div>
          <AiNotice style={{ marginTop: 16, textAlign: 'left' }} />
          <div className="stack" style={{ marginTop: 20 }}>
            <Button size="lg" block icon={<Sparkles size={18} />} onClick={() => navigate(`/materials/${material.id}/analysis`, { state: { autoStart: true } })}>
              START AI ANALYSIS
            </Button>
            <Button variant="secondary" block icon={<RotateCcw size={18} />} onClick={reset}>
              Upload another file
            </Button>
          </div>
        </div>
      )}
    </Page>
  );
}
