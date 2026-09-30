/** Study Plan - current plan card, today's tasks (tick to complete), this week, add/remove tasks. */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Plus, Trash2, FileText, ChevronRight } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { planApi, getErrorMessage } from '../services/api';
import { Page } from '../navigation/AppLayout';
import { SimpleHeader } from '../components/Ui';
import Modal from '../components/Modal';
import Button from '../components/Button';
import { TextInput, Select } from '../components/FormFields';
import { ErrorState, Skeleton } from '../components/Feedback';
import { ProgressBar } from '../components/Progress';
import { SUBJECTS } from '../utils/constants';

export default function StudyPlanScreen() {
  const { t } = useI18n();
  const toast = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const plan = useApi(() => planApi.overview(), []);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', topic: '', minutes: '30', date: '' });
  const [saving, setSaving] = useState(false);

  const subjects = [...new Set([...(user?.preferences?.subjects || []), ...SUBJECTS])];

  const toggle = async (task) => {
    plan.setData((d) => {
      const tasks = d.tasks.map((x) => (x.id === task.id ? { ...x, done: !x.done } : x));
      const doneN = tasks.filter((x) => x.done).length;
      return { ...d, tasks, todayProgress: Math.round((doneN / tasks.length) * 100) };
    });
    try {
      await planApi.update(task.id, { done: !task.done });
      plan.reload({ silent: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
      plan.reload({ silent: true });
    }
  };

  const remove = async (task) => {
    try {
      await planApi.remove(task.id);
      plan.reload({ silent: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const add = async () => {
    setSaving(true);
    try {
      await planApi.create({ ...form, date: form.date || plan.data.today });
      setAdding(false);
      setForm({ title: '', topic: '', minutes: '30', date: '' });
      plan.reload({ silent: true });
      toast.success('Task added');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const p = plan.data;
  const doneToday = p?.tasks.filter((x) => x.done).length || 0;
  const totalMin = p?.tasks.reduce((s, x) => s + x.minutes, 0) || 0;

  return (
    <Page>
      <SimpleHeader title={t('plan.title')} actions={<button className="icon-btn primary sm" onClick={() => setAdding(true)} aria-label={t('plan.addTask')}><Plus size={18} /></button>} />

      {plan.loading ? (
        <div className="stack"><Skeleton height={150} radius={22} /><Skeleton height={220} radius={20} /></div>
      ) : plan.error ? (
        <ErrorState message={plan.error} onRetry={plan.reload} />
      ) : (
        <>
          <section className="plan-hero pop-in">
            <div className="row-between" style={{ alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ color: '#fff' }}>{t('plan.current')}</h2>
                <div className="sub">{t('plan.subjects', { n: p.subjects })} • {t('plan.daysWeek', { n: p.activeDays })}</div>
              </div>
              <div className="days">
                <div className="l">{t('plan.daysLeft')}</div>
                <div className="n">{p.daysLeftInMonth}</div>
              </div>
            </div>
            <div className="row-between small" style={{ margin: '18px 0 8px' }}>
              <span className="sub">{t('plan.overall')}</span>
              <span className="bold">{p.progress}%</span>
            </div>
            <ProgressBar onHero thin value={p.progress} label={t('plan.overall')} />
          </section>

          <div className="caps-title">{t('plan.todaysTasks')}</div>
          <div className="card list-card" style={{ padding: 0 }}>
            {p.tasks.length === 0 ? (
              <div className="state" style={{ padding: 24 }}>
                <p>{t('plan.empty')}</p>
                <Button size="sm" icon={<Plus size={16} />} onClick={() => setAdding(true)}>{t('plan.addTask')}</Button>
              </div>
            ) : (
              <>
                {p.tasks.map((task) => (
                  <div key={task.id} className={`task-row ${task.done ? 'done' : ''}`}>
                    <button className={`task-check ${task.done ? 'on' : ''}`} onClick={() => toggle(task)} aria-pressed={task.done} aria-label={`Mark ${task.title} done`}>
                      {task.done && <Check size={15} strokeWidth={3} />}
                    </button>
                    <div className="grow">
                      <div className="t bold">{task.title}</div>
                      {task.topic && <div className="tiny text-2">{task.topic}</div>}
                    </div>
                    <span className="m">{task.minutes} {t('common.min')}</span>
                    <button className="icon-btn plain sm" onClick={() => remove(task)} aria-label={`Delete ${task.title}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <div className="row-between tiny text-2" style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                  <span>{t('plan.completed', { a: doneToday, b: p.tasks.length })}</span>
                  <span>{t('plan.total', { n: totalMin })}</span>
                </div>
              </>
            )}
          </div>

          <div className="caps-title">{t('plan.thisWeek')}</div>
          <div className="week-cards">
            {p.week.map((d) => (
              <div key={d.date} className={`week-card ${d.isToday ? 'today' : ''}`}>
                <span>{d.day}</span>
                <span className="n">{d.dayNum}</span>
                <span className="h">{d.minutes >= 60 ? `${Math.round((d.minutes / 60) * 10) / 10}h` : `${d.minutes}m`}</span>
                {d.total > 0 && d.done === d.total ? <Check size={16} className="ok" /> : <span className="tiny muted">{d.total ? `${d.done}/${d.total}` : '·'}</span>}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 18 }}>
            <button className="review-banner" onClick={() => navigate('/summarize')}>
              <span className="ic"><FileText size={22} /></span>
              <span className="grow">
                <span className="bold" style={{ display: 'block' }}>{t('plan.quickReview')}</span>
                <span className="sub">{t('plan.quickReviewSub')}</span>
              </span>
              <ChevronRight size={20} />
            </button>
          </div>
        </>
      )}

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title={t('plan.addTask')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdding(false)}>{t('common.cancel')}</Button>
            <Button onClick={add} loading={saving} disabled={!form.title}>{t('common.add')}</Button>
          </>
        }
      >
        <div className="stack">
          <Select label={t('plan.subject')} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} options={subjects} placeholder="Choose a subject" />
          <TextInput label={t('plan.topic')} value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="e.g. Calculus - Derivatives" maxLength={200} />
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <div className="grow"><TextInput label={t('plan.minutes')} type="number" min={5} max={600} step={5} value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} /></div>
            <div className="grow">
              <Select
                label="Day"
                value={form.date || p?.today || ''}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                options={(p?.week || []).map((d) => ({ value: d.date, label: `${d.day} ${d.dayNum}${d.isToday ? ' (today)' : ''}` }))}
              />
            </div>
          </div>
        </div>
      </Modal>
    </Page>
  );
}
