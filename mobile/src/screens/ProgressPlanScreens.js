/** Progress (analytics) and Study Plan. */
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Award, Brain, Check, ChevronRight, Clock, FileText, FileUp, Flame, FolderCheck, Gamepad2, Layers, ListChecks, MessageCircle, Plus, Sparkles, StickyNote, Target, Trash2, Trophy } from 'lucide-react-native';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useApi } from '../hooks/useApi';
import { getErrorMessage, planApi, progressApi, quizApi } from '../services/api';
import Screen, { SectionHeader } from '../components/Screen';
import { BarChart, HBarList, LineChart } from '../components/Charts';
import { Button, Card, Chip, EmptyState, ErrorState, GroupTitle, IconButton, IconTile, ListRow, ProgressBar, Row, Select, Sheet, SkeletonList, TextInput, Txt } from '../components/Ui';
import { formatDate, formatMinutes, timeAgo } from '../utils/format';
import { SUBJECTS } from '../utils/constants';

const ACTIVITY_ICONS = { upload: FileUp, analysis: Brain, quiz: Trophy, note: StickyNote, chat: MessageCircle, deck: Layers, game: Gamepad2, streak: Flame, badge: Award };

/* ---------------------------------------------------------------- progress */
export function ProgressScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [range, setRange] = useState(7);
  const overview = useApi(() => progressApi.overview({ activityLimit: 8 }), []);
  const weekly = useApi(() => progressApi.weekly(range), [range]);
  const history = useApi(() => quizApi.history(), []);
  useEffect(() => navigation.addListener('focus', () => { overview.reload({ silent: true }); weekly.reload({ silent: true }); history.reload({ silent: true }); }), [navigation]); // eslint-disable-line react-hooks/exhaustive-deps

  if (overview.error && !overview.data) return <Screen eyebrow="Your learning" title="Progress" back><ErrorState message={overview.error} onRetry={overview.reload} /></Screen>;

  const o = overview.data;
  const days = weekly.data?.days || [];
  const chartDays = days.map((d) => ({ ...d, label: range === 7 ? d.day : d.date.slice(8), tooltipLabel: formatDate(d.date, { weekday: 'short', day: 'numeric', month: 'short' }) }));
  const scorePoints = (history.data?.attempts || []).slice(0, 12).reverse().map((a) => ({ value: Math.round(a.percentage), label: `${a.topic.slice(0, 18)} · ${formatDate(a.completedAt, { day: 'numeric', month: 'short' })}` }));
  const last7 = days.slice(-7);

  const totals = [
    { icon: Clock, label: 'Total study time', value: o ? formatMinutes(o.progress.studyTime) : null, tone: 'primary' },
    { icon: FolderCheck, label: 'Completed materials', value: o?.progress.materialsCompleted, tone: 'success' },
    { icon: ListChecks, label: 'Completed quizzes', value: o?.progress.quizzesCompleted, tone: 'warning' },
    { icon: Target, label: 'Average quiz score', value: o ? `${Math.round(o.progress.averageScore)}%` : null, tone: 'primary' },
  ];

  return (
    <Screen eyebrow="Your learning" title="Progress" back>
      {overview.loading && !o ? <SkeletonList count={1} height={140} /> : o ? (
        <Card tone="primary" style={{ gap: 16 }}>
          <Row between>
            <View>
              <Txt size="sm" color="#dbeafe">Current streak</Txt>
              <Row gap={8} style={{ alignItems: 'baseline', marginTop: 4 }}>
                <Txt color="#fff" bold style={{ fontSize: 44, lineHeight: 50 }}>{o.streak.current}</Txt>
                <Txt color="#dbeafe">days · best {o.streak.longest}</Txt>
              </Row>
            </View>
            <IconTile icon={Flame} size={60} bg="rgba(255,255,255,0.18)" color="#fff" />
          </Row>
          <Row between><Txt size="sm" color="#dbeafe">This week</Txt><Txt bold color="#fff">{formatMinutes(o.weekMinutes)}</Txt></Row>
        </Card>
      ) : null}

      <Row wrap gap={12} style={{ alignItems: 'stretch' }}>
        {totals.map((s) => (
          <Card key={s.label} style={{ width: '47.5%', gap: 4 }}>
            <IconTile icon={s.icon} size={34} color={colors[s.tone]} bg={colors[`${s.tone}Soft`]} />
            <Txt size="h2" bold>{s.value ?? '–'}</Txt>
            <Txt size="xs" color="muted">{s.label}</Txt>
          </Card>
        ))}
      </Row>

      {last7.length === 7 ? (
        <Card style={{ gap: 12 }}>
          <Txt size="lg" bold>This Week</Txt>
          <Row gap={6} style={{ alignItems: 'stretch' }}>
            {last7.map((d, i) => {
              const active = d.minutes || d.quizzes || d.uploads || d.chats;
              return (
                <View key={d.date} style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 8, borderRadius: 14, backgroundColor: active ? colors.primarySoft : colors.surface2, borderWidth: i === 6 ? 2 : 0, borderColor: colors.primary }}>
                  <Txt size="xs" color="muted">{d.day}</Txt>
                  <Txt bold>{Number(d.date.slice(8))}</Txt>
                  <Txt style={{ fontSize: 9 }} color="muted">{d.minutes ? formatMinutes(d.minutes) : '–'}</Txt>
                  {active ? <Check size={13} color={colors.success} /> : <View style={{ height: 13 }} />}
                </View>
              );
            })}
          </Row>
        </Card>
      ) : null}

      <Card style={{ gap: 14 }}>
        <Row between>
          <View style={{ flex: 1 }}>
            <Txt size="lg" bold>Study time</Txt>
            <Txt size="sm" color="text2">{weekly.data ? `${formatMinutes(weekly.data.totals.minutes)} in ${range} days · ${weekly.data.totals.activeDays} active days` : 'Loading…'}</Txt>
          </View>
          <Row gap={6}>{[7, 30].map((r) => <Chip key={r} label={`${r}d`} selected={range === r} onPress={() => setRange(r)} />)}</Row>
        </Row>
        {weekly.loading && !weekly.data ? <SkeletonList count={1} height={200} /> : weekly.error && !weekly.data ? <ErrorState message={weekly.error} onRetry={weekly.reload} /> : (
          <BarChart data={chartDays} valueKey="minutes" labelKey="label" todayIndex={chartDays.length - 1} formatValue={(v) => formatMinutes(v)} />
        )}
      </Card>

      <Card style={{ gap: 10 }}>
        <Txt size="lg" bold>Quiz scores</Txt>
        <Txt size="sm" color="text2">Your last {scorePoints.length || ''} quiz results</Txt>
        {history.loading && !history.data ? <SkeletonList count={1} height={170} /> : scorePoints.length < 1 ? (
          <EmptyState icon={Trophy} title="No quiz results yet" message="Take a quiz to see your score trend." action={<Button size="sm" onPress={() => navigation.navigate('QuizSetup')}>Take a quiz</Button>} />
        ) : <LineChart points={scorePoints} />}
      </Card>

      <Card style={{ gap: 14 }}>
        <Txt size="lg" bold>Average score by subject</Txt>
        {o && o.scoreBySubject.length ? (
          <HBarList items={o.scoreBySubject.map((s) => ({ label: s.subject, value: Math.round(s.averageScore), sub: `${s.attempts} quiz${s.attempts === 1 ? '' : 'zes'}` }))} />
        ) : <Txt size="sm" color="text2">Complete quizzes in different subjects to compare your strengths.</Txt>}
      </Card>

      <Card padded={false}>
        <Txt size="lg" bold style={{ padding: 14, paddingBottom: 4 }}>Learning activity</Txt>
        {o && o.recentActivity.length === 0 ? <Txt size="sm" color="text2" style={{ padding: 14 }}>No activity yet.</Txt> : null}
        {o?.recentActivity.map((a, i) => <ListRow key={`${a.type}-${a.refId}-${i}`} first icon={ACTIVITY_ICONS[a.type] || Sparkles} title={a.title} desc={timeAgo(a.at)} right={null} />)}
      </Card>
    </Screen>
  );
}

/* ---------------------------------------------------------------- study plan */
export function StudyPlanScreen() {
  const { t } = useI18n();
  const toast = useToast();
  const { user } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation();
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
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    plan.reload({ silent: true });
  };

  const remove = async (task) => {
    try { await planApi.remove(task.id); plan.reload({ silent: true }); } catch (err) { toast.error(getErrorMessage(err)); }
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
    <Screen title={t('plan.title')} back actions={<IconButton icon={Plus} bg={colors.primary} color="#fff" onPress={() => setAdding(true)} label={t('plan.addTask')} />}>
      {plan.loading && !p ? <SkeletonList count={2} height={170} /> : plan.error && !p ? <ErrorState message={plan.error} onRetry={plan.reload} /> : (
        <>
          <Card tone="primary" style={{ gap: 10 }}>
            <Row between center={false}>
              <View style={{ flex: 1 }}>
                <Txt size="h2" bold color="#fff">{t('plan.current')}</Txt>
                <Txt size="sm" color="#dbeafe">{t('plan.subjects', { n: p.subjects })} • {t('plan.daysWeek', { n: p.activeDays })}</Txt>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Txt size="xs" color="#dbeafe">{t('plan.daysLeft')}</Txt>
                <Txt size="h1" bold color="#fff">{p.daysLeftInMonth}</Txt>
              </View>
            </Row>
            <Row between style={{ marginTop: 8 }}><Txt size="sm" color="#dbeafe">{t('plan.overall')}</Txt><Txt bold color="#fff">{p.progress}%</Txt></Row>
            <ProgressBar onHero thin value={p.progress} />
          </Card>

          <GroupTitle>{t('plan.todaysTasks')}</GroupTitle>
          <Card padded={false}>
            {p.tasks.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center', gap: 10 }}>
                <Txt color="text2" center>{t('plan.empty')}</Txt>
                <Button size="sm" icon={Plus} onPress={() => setAdding(true)}>{t('plan.addTask')}</Button>
              </View>
            ) : (
              <>
                {p.tasks.map((task, i) => (
                  <View key={task.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border, opacity: task.done ? 0.6 : 1 }}>
                    <Pressable onPress={() => toggle(task)} accessibilityLabel={`Mark ${task.title} done`} style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: task.done ? colors.success : colors.border, backgroundColor: task.done ? colors.success : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      {task.done ? <Check size={15} color="#fff" strokeWidth={3} /> : null}
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <Txt bold style={{ textDecorationLine: task.done ? 'line-through' : 'none' }}>{task.title}</Txt>
                      {task.topic ? <Txt size="xs" color="text2">{task.topic}</Txt> : null}
                    </View>
                    <Txt size="sm" color="muted">{task.minutes} {t('common.min')}</Txt>
                    <IconButton icon={Trash2} size={34} bg="transparent" color={colors.danger} onPress={() => remove(task)} label={`Delete ${task.title}`} />
                  </View>
                ))}
                <Row between style={{ padding: 14, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <Txt size="xs" color="text2">{t('plan.completed', { a: doneToday, b: p.tasks.length })}</Txt>
                  <Txt size="xs" color="text2">{t('plan.total', { n: totalMin })}</Txt>
                </Row>
              </>
            )}
          </Card>

          <GroupTitle>{t('plan.thisWeek')}</GroupTitle>
          <Row gap={6} style={{ alignItems: 'stretch' }}>
            {p.week.map((d) => (
              <View key={d.date} style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10, borderRadius: 14, backgroundColor: d.isToday ? colors.primarySoft : colors.surface, borderWidth: d.isToday ? 2 : 1, borderColor: d.isToday ? colors.primary : colors.border }}>
                <Txt size="xs" color="muted">{d.day}</Txt>
                <Txt bold>{d.dayNum}</Txt>
                <Txt style={{ fontSize: 10 }} color="text2">{d.minutes >= 60 ? `${Math.round((d.minutes / 60) * 10) / 10}h` : `${d.minutes}m`}</Txt>
                {d.total > 0 && d.done === d.total ? <Check size={14} color={colors.success} /> : <Txt style={{ fontSize: 10 }} color="muted">{d.total ? `${d.done}/${d.total}` : '·'}</Txt>}
              </View>
            ))}
          </Row>

          <Card tone="soft" onPress={() => navigation.navigate('Summarize')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <IconTile icon={FileText} bg={colors.primary} color="#fff" />
            <View style={{ flex: 1 }}>
              <Txt bold>{t('plan.quickReview')}</Txt>
              <Txt size="sm" color="text2">{t('plan.quickReviewSub')}</Txt>
            </View>
            <ChevronRight size={20} color={colors.primary} />
          </Card>
        </>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title={t('plan.addTask')} footer={<><Button variant="secondary" onPress={() => setAdding(false)}>{t('common.cancel')}</Button><Button onPress={add} loading={saving} disabled={!form.title}>{t('common.add')}</Button></>}>
        <View style={{ gap: 14 }}>
          <Select label={t('plan.subject')} value={form.title} onChange={(v) => setForm({ ...form, title: v })} options={subjects} placeholder="Choose a subject" />
          <TextInput label={t('plan.topic')} value={form.topic} onChangeText={(v) => setForm({ ...form, topic: v })} placeholder="e.g. Calculus - Derivatives" maxLength={200} />
          <Row center={false}>
            <View style={{ flex: 1 }}><TextInput label={t('plan.minutes')} keyboardType="numeric" value={form.minutes} onChangeText={(v) => setForm({ ...form, minutes: v.replace(/[^\d]/g, '') })} /></View>
            <View style={{ flex: 1 }}>
              <Select label="Day" value={form.date || p?.today || ''} onChange={(v) => setForm({ ...form, date: v })} options={(p?.week || []).map((d) => ({ value: d.date, label: `${d.day} ${d.dayNum}${d.isToday ? ' (today)' : ''}` }))} />
            </View>
          </Row>
        </View>
      </Sheet>
    </Screen>
  );
}
