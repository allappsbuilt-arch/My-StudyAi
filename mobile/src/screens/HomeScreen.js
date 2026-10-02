/** Home dashboard - greeting bar, streak, quick actions, today's plan, continue learning, recent activity. */
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { ArrowUp, Award, Bell, Brain, ChevronRight, Clock, Flame, FileUp, Gamepad2, Languages, Layers, ListChecks, MessageCircle, NotebookPen, ScanLine, Sparkles, StickyNote, Trophy, Upload, User } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { useTheme } from '../context/ThemeContext';
import { useApi } from '../hooks/useApi';
import { flashcardApi, localDate, materialApi, planApi, progressApi } from '../services/api';
import Screen, { SectionHeader } from '../components/Screen';
import { Avatar, BotIcon } from '../components/Brand';
import { AlertDialog, Card, ErrorState, ExploreRow, IconButton, IconTile, ProgressBar, Row, SkeletonList, Txt } from '../components/Ui';
import { FileTypeIcon } from '../components/Misc';
import AssistantSheet from '../components/AssistantSheet';
import { firstName, timeAgo } from '../utils/format';
import { TextInput as RNInput } from 'react-native';

const ACTIVITY_ICONS = { upload: FileUp, analysis: Brain, quiz: Trophy, note: StickyNote, chat: MessageCircle, deck: Layers, game: Gamepad2, streak: Flame, badge: Award };
const CHECKIN_KEY = 'mystudyai_checkin';

export function HomeScreen() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const go = (name, params) => navigation.navigate(name, params);
  const [ask, setAsk] = useState('');
  const [streakDialog, setStreakDialog] = useState(false);
  const [assistant, setAssistant] = useState({ open: false, prompt: '' });

  const overview = useApi(() => progressApi.overview({ activityLimit: 6 }), []);
  const materials = useApi(() => materialApi.list(), []);
  const plan = useApi(() => planApi.overview(), []);
  const decks = useApi(() => flashcardApi.decks(), []);

  // Refresh when coming back to this tab
  useEffect(() => navigation.addListener('focus', () => {
    overview.reload({ silent: true });
    materials.reload({ silent: true });
    plan.reload({ silent: true });
    decks.reload({ silent: true });
  }), [navigation]); // eslint-disable-line react-hooks/exhaustive-deps

  // Daily check-in: opening the app counts as today's activity and keeps the streak going
  useEffect(() => {
    if (!user) return;
    const today = localDate();
    const key = `${CHECKIN_KEY}_${user.id}`;
    AsyncStorage.getItem(key).then((last) => {
      if (last === today) return;
      progressApi.addStudyTime(1).then(() => {
        AsyncStorage.setItem(key, today).catch(() => {});
        setStreakDialog(true);
        overview.reload({ silent: true });
      }).catch(() => {});
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const p = overview.data;
  const pl = plan.data;

  const continueItems = [
    ...(decks.data?.decks || []).map((d) => ({ key: `d${d.id}`, kind: 'deck', title: d.title, pct: d.mastery, at: d.lastStudiedAt || d.updatedAt, go: () => go('Deck', { id: d.id }) })),
    ...(materials.data?.materials || []).map((m) => ({
      key: `m${m.id}`, kind: m.fileType, title: m.filename, pct: m.hasAnalysis ? 100 : m.analysisStatus === 'not_started' ? 10 : 50, at: m.uploadedAt,
      go: () => go(m.hasAnalysis ? 'Summary' : 'Analysis', { id: m.id }),
    })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 8);

  const submitAsk = () => {
    setAssistant({ open: true, prompt: ask.trim() });
    setAsk('');
  };

  const openActivity = (a) => {
    if (a.type === 'upload' || a.type === 'analysis') go('Summary', { id: a.refId });
    else if (a.type === 'quiz') go('QuizHistory');
    else if (a.type === 'note') go('Notes');
    else if (a.type === 'chat') go('Tutor', { conversationId: a.meta });
    else if (a.type === 'deck') go('Deck', { id: a.refId });
    else if (a.type === 'game') go('Games');
    else if (a.type === 'streak' || a.type === 'badge') go('Progress');
  };

  const quick = [
    { label: t('nav.flashcards'), icon: Layers, to: 'Flashcards' },
    { label: t('home.scan'), icon: ScanLine, to: 'Scan' },
    { label: t('home.translate'), icon: Languages, to: 'Translate' },
    { label: t('nav.notes'), icon: NotebookPen, to: 'Notes' },
    { label: t('nav.quiz'), icon: ListChecks, to: 'QuizSetup' },
    { label: t('f.upload'), icon: Upload, to: 'Upload' },
    { label: t('nav.tutor'), icon: Sparkles, to: 'Tutor' },
  ];

  const refreshing = overview.loading && Boolean(p);
  const reloadAll = () => { overview.reload(); materials.reload(); plan.reload(); decks.reload(); };

  return (
    <Screen onRefresh={reloadAll} refreshing={refreshing} header={false}>
      <Row>
        <Pressable onPress={() => go('Profile')} accessibilityLabel={t('nav.profile')}><Avatar user={user} /></Pressable>
        <View style={{ flex: 1 }}>
          <Txt size="sm" color="text2">{t('home.welcome')}</Txt>
          <Txt size="xl" bold numberOfLines={1}>{firstName(user?.name)}</Txt>
        </View>
        <View>
          <IconButton icon={Bell} onPress={() => go('Notifications')} label={t('profile.notifications')} />
          {p && !p.streak.studiedToday ? <View style={{ position: 'absolute', top: 8, right: 9, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.danger }} /> : null}
        </View>
        <IconButton icon={User} onPress={() => go('Profile')} label={t('nav.profile')} />
      </Row>

      {/* Streak */}
      {overview.loading && !p ? <SkeletonList count={1} height={168} /> : overview.error && !p ? <Card><ErrorState message={overview.error} onRetry={overview.reload} /></Card> : p ? (
        <Card style={{ gap: 14 }}>
          <Row between>
            <View>
              <Txt size="sm" color="text2">{t('home.currentStreak')}</Txt>
              <Row gap={8} style={{ alignItems: 'baseline', marginTop: 4 }}>
                <Txt size="hero" bold color="primary" style={{ fontSize: 44, lineHeight: 50 }}>{p.streak.current}</Txt>
                <Txt color="text2">{p.streak.current === 1 ? t('common.day') : t('common.days')}</Txt>
              </Row>
            </View>
            <IconTile icon={Flame} size={64} color={colors.warning} bg={colors.warningSoft} />
          </Row>
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <Row between>
            <View>
              <Txt size="xs" color="muted">{t('home.longestStreak')}</Txt>
              <Txt bold>{p.streak.longest} {p.streak.longest === 1 ? t('common.day') : t('common.days')}</Txt>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Txt size="xs" color="muted">{t('home.today')}</Txt>
              <Row gap={6}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: p.streak.studiedToday ? colors.success : colors.warning }} />
                <Txt size="sm" bold>{p.streak.studiedToday ? t('common.done') : t('common.pending')}</Txt>
              </Row>
            </View>
          </Row>
        </Card>
      ) : null}

      {/* Quick actions */}
      <SectionHeader title={t('home.quickActions')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }} style={{ marginHorizontal: -16 }} contentInset={{ left: 16 }}>
        <View style={{ width: 4 }} />
        {quick.map((a) => (
          <Pressable key={a.to} onPress={() => go(a.to)} style={{ width: 82, alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <IconTile icon={a.icon} size={44} />
            <Txt size="xs" bold center numberOfLines={1}>{a.label}</Txt>
          </Pressable>
        ))}
        <View style={{ width: 4 }} />
      </ScrollView>

      {/* Today's study plan */}
      {plan.loading && !pl ? <SkeletonList count={1} height={190} /> : pl ? (
        <Card onPress={() => go('StudyPlan')} style={{ gap: 10 }}>
          <Row between>
            <View>
              <Txt size="lg" bold>{t('home.todaysPlan')}</Txt>
              <Txt size="sm" color="text2">{t('plan.subjects', { n: pl.tasks.length })}</Txt>
            </View>
            <ChevronRight size={20} color={colors.muted} />
          </Row>
          {pl.tasks.length ? (
            <>
              <Row between><Txt size="sm" color="text2">{t('home.progress')}</Txt><Txt size="sm" bold color="primary">{pl.todayProgress}%</Txt></Row>
              <ProgressBar thin value={pl.todayProgress} />
              {pl.tasks.slice(0, 4).map((task) => (
                <Row key={task.id} style={{ opacity: task.done ? 0.55 : 1 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: task.done ? colors.success : colors.primary }} />
                  <Txt style={{ flex: 1, textDecorationLine: task.done ? 'line-through' : 'none' }} numberOfLines={1}>{task.title}</Txt>
                  <Txt size="sm" color="muted">{task.minutes} {t('common.min')}</Txt>
                </Row>
              ))}
            </>
          ) : (
            <Txt size="sm" bold color="primary">{t('home.noPlan')} · {t('home.planNow')}</Txt>
          )}
        </Card>
      ) : null}

      {/* Continue learning */}
      <SectionHeader title={t('home.continueLearning')} action={t('common.seeAll')} onAction={() => go('Materials')} />
      {materials.loading && decks.loading && !continueItems.length ? <SkeletonList count={1} height={150} /> : continueItems.length === 0 ? (
        <ExploreRow icon={Upload} title={t('home.uploadFirst')} desc={t('home.uploadFirstSub')} onPress={() => go('Upload')} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }} style={{ marginHorizontal: -16 }}>
          {continueItems.map((c) => (
            <Card key={c.key} onPress={c.go} style={{ width: 172, gap: 8 }}>
              {c.kind === 'deck' ? <IconTile icon={Layers} size={38} /> : <FileTypeIcon type={c.kind} size={38} />}
              <Txt size="sm" bold numberOfLines={2} style={{ minHeight: 36 }}>{c.title}</Txt>
              <ProgressBar thin value={c.pct} />
              <Txt size="xs" color="muted">{c.pct}%</Txt>
              <Row gap={4}><Clock size={12} color={colors.muted} /><Txt size="xs" color="muted">{timeAgo(c.at)}</Txt></Row>
            </Card>
          ))}
        </ScrollView>
      )}

      {/* Recent activity */}
      <SectionHeader title={t('home.recentActivity')} action={t('common.seeAll')} onAction={() => go('StudyHistory')} />
      {overview.loading && !p ? <SkeletonList count={3} height={60} /> : p && p.recentActivity.length === 0 ? (
        <Card><Txt size="sm" color="text2" center>{t('home.noActivity')}</Txt></Card>
      ) : p ? (
        <Card padded={false}>
          {p.recentActivity.map((a, i) => {
            const Icon = ACTIVITY_ICONS[a.type] || Sparkles;
            return (
              <Pressable key={`${a.type}-${a.refId}-${i}`} onPress={() => openActivity(a)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
                <IconTile icon={Icon} size={36} />
                <View style={{ flex: 1 }}>
                  <Txt size="sm" weight="500" numberOfLines={2}>{a.title}</Txt>
                  <Txt size="xs" color="muted">{timeAgo(a.at)}</Txt>
                </View>
              </Pressable>
            );
          })}
        </Card>
      ) : null}

      {/* Ask StudyAI */}
      <Row style={{ backgroundColor: colors.surface, borderRadius: 999, borderWidth: 1, borderColor: colors.border, padding: 6, paddingLeft: 8 }}>
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#0b1220', alignItems: 'center', justifyContent: 'center' }}><BotIcon size={22} /></View>
        <RNInput value={ask} onChangeText={setAsk} onFocus={() => !ask && setAssistant({ open: true, prompt: '' })} onSubmitEditing={submitAsk} placeholder={t('home.askPlaceholder')} placeholderTextColor={colors.muted} style={{ flex: 1, color: colors.text, fontSize: 15, paddingVertical: 8 }} />
        <IconButton icon={ArrowUp} bg={colors.primary} color="#fff" onPress={submitAsk} label={t('home.askTitle')} size={38} />
      </Row>

      <AssistantSheet open={assistant.open} initialPrompt={assistant.prompt} onClose={() => setAssistant({ open: false, prompt: '' })} />
      <AlertDialog open={streakDialog} title={`🎉 ${t('home.streakUpdated')}`} message={t('home.streakUpdatedMsg')} onClose={() => setStreakDialog(false)} />
    </Screen>
  );
}
