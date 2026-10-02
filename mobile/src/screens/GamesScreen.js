/** Games hub - streak / wins / rank, featured games, more games and the leaderboard. */
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Calculator, ChevronRight, Flame, Gauge, Grid2x2, Layers, Medal, SpellCheck, Swords, Trophy, Users } from 'lucide-react-native';
import { useI18n } from '../context/I18nContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useApi } from '../hooks/useApi';
import { GAME_NAMES, gameApi } from '../services/api';
import Screen, { SectionHeader } from '../components/Screen';
import { Avatar } from '../components/Brand';
import { Badge, Card, IconTile, Row, SkeletonList, Txt } from '../components/Ui';

export const GAMES = {
  matching: { icon: Grid2x2, desc: 'Match terms with definitions', level: 'Easy' },
  battle: { icon: Swords, desc: 'Race the clock on quick questions', level: 'Medium' },
  streak: { icon: Flame, desc: 'Answer in a row without a miss', level: 'Medium' },
  memory: { icon: Layers, desc: 'Test your memory', level: 'Easy' },
  spelling: { icon: SpellCheck, desc: 'Improve vocabulary', level: 'Medium' },
  mathrush: { icon: Calculator, desc: 'Quick math drills', level: 'Hard' },
};

export function GamesScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const stats = useApi(() => gameApi.stats(), []);
  const board = useApi(() => gameApi.leaderboard(), []);
  const s = stats.data;

  useEffect(() => navigation.addListener('focus', () => { stats.reload({ silent: true }); board.reload({ silent: true }); }), [navigation]); // eslint-disable-line react-hooks/exhaustive-deps

  const featured = ['matching', 'battle'];
  const more = ['streak', 'memory', 'spelling', 'mathrush'];
  const play = (g) => navigation.navigate('GamePlay', { game: g });

  return (
    <Screen header={false}>
      <Txt size="h1" bold>{t('games.title')}</Txt>

      {stats.loading && !s ? <SkeletonList count={1} height={112} /> : (
        <Card style={{ flexDirection: 'row' }}>
          {[[Flame, s?.streak ?? 0, t('games.dayStreak')], [Trophy, s?.wins ?? 0, t('games.wins')], [Medal, `#${s?.rank ?? '–'}`, t('games.rank')]].map(([Icon, v, l]) => (
            <View key={l} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <IconTile icon={Icon} size={36} />
              <Txt size="xl" bold>{v}</Txt>
              <Txt size="xs" color="muted">{l}</Txt>
            </View>
          ))}
        </Card>
      )}

      <SectionHeader title={t('games.featured')} />
      {featured.map((g) => {
        const G = GAMES[g];
        return (
          <Card key={g} onPress={() => play(g)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <IconTile icon={G.icon} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt bold>{GAME_NAMES[g]}</Txt>
              <Txt size="sm" color="text2">{G.desc}</Txt>
              <Row gap={12} wrap>
                <Row gap={4}><Users size={12} color={colors.muted} /><Txt size="xs" color="muted">{s?.players?.[g] ?? 0} {t('common.playing')}</Txt></Row>
                <Row gap={4}><Gauge size={12} color={colors.muted} /><Txt size="xs" color="muted">{G.level}</Txt></Row>
                {s?.perGame?.[g] ? <Row gap={4}><Trophy size={12} color={colors.muted} /><Txt size="xs" color="muted">{t('games.best')} {s.perGame[g].best}</Txt></Row> : null}
              </Row>
            </View>
            <ChevronRight size={20} color={colors.muted} />
          </Card>
        );
      })}

      <SectionHeader title={t('games.more')} />
      <Row wrap gap={12} style={{ alignItems: 'stretch' }}>
        {more.map((g) => {
          const G = GAMES[g];
          return (
            <Card key={g} onPress={() => play(g)} style={{ width: '47.5%', gap: 8 }}>
              <IconTile icon={G.icon} />
              <Txt bold>{GAME_NAMES[g]}</Txt>
              <Txt size="xs" color="text2">{G.desc}</Txt>
              {s?.perGame?.[g] ? <Badge>{t('games.best')} {s.perGame[g].best}</Badge> : null}
            </Card>
          );
        })}
      </Row>

      <SectionHeader title={t('games.leaderboard')} />
      <Card padded={false}>
        {board.loading && !board.data ? <View style={{ padding: 16 }}><SkeletonList count={1} height={60} /></View> : !board.data?.length ? (
          <Txt size="sm" color="text2" center style={{ padding: 16 }}>Play a game to get on the leaderboard!</Txt>
        ) : board.data.map((p, i) => (
          <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border, backgroundColor: p.id === user?.id ? colors.primarySoft : 'transparent' }}>
            <Txt bold style={{ width: 24, textAlign: 'center' }}>{i + 1}</Txt>
            <Avatar user={p} size={36} />
            <Txt bold style={{ flex: 1 }} numberOfLines={1}>{p.name}{p.id === user?.id ? ' (you)' : ''}</Txt>
            <Txt size="sm" bold color="primary">{p.points} pts</Txt>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
