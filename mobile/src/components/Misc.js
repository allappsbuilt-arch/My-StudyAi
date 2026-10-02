/** Smaller shared components: Markdown, FileTypeIcon, AiNotice, LanguageMenu. */
import { Linking, Pressable, View } from 'react-native';
import MarkdownDisplay from 'react-native-markdown-display';
import { File, FileImage, FileText, FileVideo, Globe, KeyRound } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { LANGUAGES, useI18n } from '../context/I18nContext';
import { Alert, IconTile, Select, Sheet, Txt } from './Ui';
import { useState } from 'react';

/** Renders AI Markdown (headings, lists, bold, code, tables). */
export function Markdown({ children, color }) {
  const { colors } = useTheme();
  const fg = color || colors.text;
  return (
    <MarkdownDisplay
      onLinkPress={(url) => { Linking.openURL(url).catch(() => {}); return false; }}
      style={{
        body: { color: fg, fontSize: 15, lineHeight: 22 },
        heading1: { color: fg, fontSize: 22, fontWeight: '800', marginTop: 8 },
        heading2: { color: fg, fontSize: 19, fontWeight: '800', marginTop: 8 },
        heading3: { color: fg, fontSize: 16, fontWeight: '700', marginTop: 6 },
        strong: { fontWeight: '700' },
        link: { color: colors.primary },
        bullet_list_icon: { color: fg },
        code_inline: { backgroundColor: colors.surface2, color: fg, borderRadius: 4, paddingHorizontal: 4 },
        code_block: { backgroundColor: colors.surface2, color: fg, borderColor: colors.border, borderRadius: 10, padding: 10 },
        fence: { backgroundColor: colors.surface2, color: fg, borderColor: colors.border, borderRadius: 10, padding: 10 },
        blockquote: { backgroundColor: colors.surface2, borderLeftColor: colors.primary, borderLeftWidth: 3, paddingHorizontal: 10 },
        table: { borderColor: colors.border },
        th: { borderColor: colors.border, padding: 6 },
        td: { borderColor: colors.border, padding: 6 },
        hr: { backgroundColor: colors.border },
      }}
    >
      {children || ''}
    </MarkdownDisplay>
  );
}

const FILE_MAP = {
  pdf: { icon: FileText, tone: 'danger', label: 'PDF' },
  video: { icon: FileVideo, tone: 'warning', label: 'Video' },
  image: { icon: FileImage, tone: 'success', label: 'Image' },
  document: { icon: File, tone: 'primary', label: 'Document' },
};

export const fileTypeLabel = (type) => FILE_MAP[type]?.label || 'File';

export function FileTypeIcon({ type, size = 44 }) {
  const { colors } = useTheme();
  const entry = FILE_MAP[type] || FILE_MAP.document;
  const fg = colors[entry.tone];
  const bg = colors[`${entry.tone}Soft`];
  return <IconTile icon={entry.icon} size={size} color={fg} bg={bg} />;
}

export const AI_NOT_CONFIGURED_TEXT = 'AI features require an AI API key. Please configure AI_API_KEY in Backend/.env and restart the AI server.';

export function AiNotice() {
  const { aiConfigured } = useAuth();
  if (aiConfigured) return null;
  return <Alert type="info" icon={KeyRound}>{AI_NOT_CONFIGURED_TEXT}</Alert>;
}

/** Compact language picker (globe + current language) used on the auth screens. */
export function LanguageMenu() {
  const { lang, setLang } = useI18n();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === lang);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}>
        <Globe size={16} color={colors.text2} />
        <Txt size="sm" bold color="text2">{current?.native}</Txt>
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title="Language">
        <View>
          {LANGUAGES.map((l) => (
            <Pressable key={l.code} onPress={() => { setLang(l.code); setOpen(false); }} style={{ paddingVertical: 14 }}>
              <Txt bold={l.code === lang} color={l.code === lang ? 'primary' : 'text'}>{l.native}  <Txt color="muted" size="sm">{l.label}</Txt></Txt>
            </Pressable>
          ))}
        </View>
      </Sheet>
    </>
  );
}

export { Select };
