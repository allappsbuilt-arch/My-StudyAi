/** Explore - every feature in one place, grouped by category, with search and filter chips. */
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BarChart3, Bell, CalendarCheck, FileText, FolderOpen, Gamepad2, Languages, Layers, ListChecks, Mic, NotebookPen, PenLine, ScanLine, Sparkles, Upload, Users } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import Screen from '../components/Screen';
import { Avatar } from '../components/Brand';
import { Card, Chip, ExploreRow, IconButton, Row, SearchBar, Txt } from '../components/Ui';

const GROUPS = [
  { id: 'create', label: 'explore.create', items: [
    { k: 'flashcards', icon: Layers, to: 'Flashcards' },
    { k: 'quizzes', icon: ListChecks, to: 'QuizSetup' },
    { k: 'notes', icon: NotebookPen, to: 'Notes' },
    { k: 'materials', icon: FolderOpen, to: 'Materials' },
  ] },
  { id: 'ai', label: 'explore.ai', items: [
    { k: 'scan', icon: ScanLine, to: 'Scan' },
    { k: 'translate', icon: Languages, to: 'Translate' },
    { k: 'summarize', icon: FileText, to: 'Summarize' },
    { k: 'lecture', icon: Mic, to: 'Record' },
    { k: 'essay', icon: PenLine, to: 'Essay' },
    { k: 'tutor', icon: Sparkles, to: 'Tutor' },
  ] },
  { id: 'plan', label: 'explore.plan', items: [
    { k: 'plan', icon: CalendarCheck, to: 'StudyPlan' },
    { k: 'analytics', icon: BarChart3, to: 'Progress' },
    { k: 'upload', icon: Upload, to: 'Upload' },
  ] },
  { id: 'community', label: 'explore.community', items: [
    { k: 'community', icon: Users, to: 'Socials' },
    { k: 'games', icon: Gamepad2, to: 'Games' },
  ] },
];

export function ExploreScreen() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GROUPS.filter((g) => filter === 'all' || g.id === filter)
      .map((g) => ({ ...g, items: g.items.filter((it) => !q || `${t(`f.${it.k}`)} ${t(`f.${it.k}.d`)}`.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length);
  }, [query, filter, t]);

  return (
    <Screen header={false}>
      <Row>
        <Avatar user={user} />
        <View style={{ flex: 1 }}>
          <Txt size="sm" color="text2">{t('explore.discover')}</Txt>
          <Txt size="xl" bold>{t('explore.title')}</Txt>
        </View>
        <IconButton icon={Bell} onPress={() => navigation.navigate('Notifications')} label={t('profile.notifications')} />
      </Row>

      <SearchBar value={query} onChange={setQuery} placeholder={t('explore.search')} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
        {[{ id: 'all', label: 'explore.all' }, ...GROUPS].map((g) => <Chip key={g.id} label={t(g.label)} selected={filter === g.id} onPress={() => setFilter(g.id)} />)}
      </ScrollView>

      {groups.length === 0 ? <Card><Txt size="sm" color="text2" center>{t('explore.none')}</Txt></Card> : null}

      {groups.map((g) => (
        <View key={g.id} style={{ gap: 10 }}>
          <Row between>
            <Txt size="lg" bold>{t(g.label)}</Txt>
            <Txt size="sm" color="muted">{g.items.length} {t('common.tools')}</Txt>
          </Row>
          {g.items.map((it) => <ExploreRow key={it.k} icon={it.icon} title={t(`f.${it.k}`)} desc={t(`f.${it.k}.d`)} onPress={() => navigation.navigate(it.to)} />)}
        </View>
      ))}
    </Screen>
  );
}
