/**
 * 9. AI analysis - starts the analysis and follows its real status from the backend
 * (polling every 2 seconds) until the study summary is ready.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Check, Loader2, Sparkles, AlertTriangle, RotateCcw, Upload, FileSearch, ScanText, Brain, FileText, ListChecks, HelpCircle } from 'lucide-react';
import { analysisApi, getErrorMessage } from '../services/api';
import { Page } from '../navigation/AppLayout';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { ProgressBar } from '../components/Progress';
import { PageLoader, ErrorState } from '../components/Feedback';
import FileTypeIcon from '../components/FileTypeIcon';
import { formatBytes } from '../utils/format';

const STEPS = [
  { key: 'upload', label: 'Upload processing', icon: Upload },
  { key: 'extract', label: 'Text extraction', icon: ScanText },
  { key: 'content', label: 'Content analysis', icon: FileSearch },
  { key: 'summary', label: 'Summary generation', icon: FileText },
  { key: 'keypoints', label: 'Key point generation', icon: ListChecks },
  { key: 'questions', label: 'Question generation', icon: HelpCircle },
];

/**
 * The backend reports: extracting -> analyzing -> completed.
 * While "analyzing" (one AI request), the sub-steps advance over time so the
 * student can see what the AI is working on.
 */
function activeStepIndex(status, analyzingSeconds) {
  if (status === 'completed') return STEPS.length;
  if (status === 'extracting') return 1;
  if (status === 'analyzing') return Math.min(2 + Math.floor(analyzingSeconds / 12), STEPS.length - 1);
  return 0;
}

export default function AnalysisScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState(null);
  const [material, setMaterial] = useState(null);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [starting, setStarting] = useState(false);
  const [analyzingSince, setAnalyzingSince] = useState(null);
  const [, setTick] = useState(0);
  const pollRef = useRef(null);
  const startedRef = useRef(false);

  const poll = useCallback(async () => {
    try {
      const res = await analysisApi.get(id);
      setMaterial(res.material);
      setStatus(res.status);
      setLoadError('');
      if (res.status === 'failed') setError(res.error || 'Analysis failed.');
      if (res.status === 'analyzing') setAnalyzingSince((s) => s || Date.now());
      return res.status;
    } catch (err) {
      setLoadError(getErrorMessage(err));
      return 'error';
    }
  }, [id]);

  const start = useCallback(async () => {
    setStarting(true);
    setError('');
    setAnalyzingSince(null);
    try {
      await analysisApi.start(id);
      setStatus('extracting');
    } catch (err) {
      setError(getErrorMessage(err));
      setStatus('failed');
    } finally {
      setStarting(false);
    }
  }, [id]);

  // First load: fetch status, auto-start if we came from the upload screen
  useEffect(() => {
    (async () => {
      const s = await poll();
      if (!startedRef.current && (s === 'not_started' || (s === 'failed' && location.state?.autoStart))) {
        startedRef.current = true;
        if (location.state?.autoStart || s === 'not_started') await start();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Poll while running
  useEffect(() => {
    const running = status === 'extracting' || status === 'analyzing';
    if (!running) return undefined;
    pollRef.current = setInterval(poll, 2000);
    const ticker = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      clearInterval(pollRef.current);
      clearInterval(ticker);
    };
  }, [status, poll]);

  // Done -> go to the summary
  useEffect(() => {
    if (status === 'completed') {
      const t = setTimeout(() => navigate(`/materials/${id}/summary`, { replace: true }), 900);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [status, id, navigate]);

  if (loadError && !material) {
    return (
      <Page>
        <PageHeader back="/materials" title="AI Analysis" />
        <ErrorState message={loadError} onRetry={poll} />
      </Page>
    );
  }
  if (!material) {
    return (
      <Page>
        <PageLoader label="Loading material..." />
      </Page>
    );
  }

  const analyzingSeconds = analyzingSince ? (Date.now() - analyzingSince) / 1000 : 0;
  const active = activeStepIndex(status, analyzingSeconds);
  const pct = status === 'completed' ? 100 : Math.round(((active + 0.5) / STEPS.length) * 100);
  const failed = status === 'failed';

  return (
    <Page>
      <PageHeader back="/materials" eyebrow="AI Analysis" title={material.filename} />

      <div className="card center" style={{ padding: '28px 18px' }}>
        <div className="stack" style={{ alignItems: 'center' }}>
          {failed ? (
            <div className="icon-tile danger lg round">
              <AlertTriangle size={30} />
            </div>
          ) : status === 'completed' ? (
            <div className="icon-tile success lg round">
              <Check size={32} />
            </div>
          ) : (
            <div className="pulse-orb">
              <div className="icon-tile solid lg round">
                <Brain size={28} />
              </div>
            </div>
          )}
          <h2>{failed ? 'Analysis failed' : status === 'completed' ? 'Your study guide is ready!' : 'AI is analysing your material...'}</h2>
          <p className="small text-2" style={{ maxWidth: 380 }}>
            {failed
              ? error
              : status === 'completed'
                ? 'Opening your summary…'
                : 'This usually takes under a minute. You can leave this page — the analysis keeps running.'}
          </p>
        </div>

        {!failed && (
          <div style={{ marginTop: 22, textAlign: 'left' }}>
            <div className="row-between small" style={{ marginBottom: 8 }}>
              <span className="text-2">Progress</span>
              <span className="bold">{pct}%</span>
            </div>
            <ProgressBar value={pct} label="Analysis progress" />
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="file-row" style={{ marginBottom: 10 }}>
          <FileTypeIcon type={material.fileType} size="sm" />
          <div className="grow">
            <div className="small bold truncate">{material.filename}</div>
            <div className="tiny muted">{formatBytes(material.fileSize)}</div>
          </div>
        </div>
        <div className="steps">
          {STEPS.map((s, i) => {
            const state = failed ? (i < active ? 'done' : '') : i < active ? 'done' : i === active ? 'active' : '';
            return (
              <div key={s.key} className={`step ${state}`}>
                <span className="bullet">
                  {state === 'done' ? <Check size={16} /> : state === 'active' ? <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} /> : <s.icon size={16} />}
                </span>
                <span className="label">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {failed && (
        <div className="stack" style={{ marginTop: 16 }}>
          <Button size="lg" block icon={<RotateCcw size={18} />} loading={starting} onClick={start}>
            Try again
          </Button>
          <Button variant="secondary" block onClick={() => navigate('/materials')}>
            Back to materials
          </Button>
        </div>
      )}
      {status === 'not_started' && !starting && (
        <div style={{ marginTop: 16 }}>
          <Button size="lg" block icon={<Sparkles size={18} />} onClick={start}>
            START AI ANALYSIS
          </Button>
        </div>
      )}
    </Page>
  );
}
