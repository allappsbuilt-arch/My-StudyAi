/**
 * Quick AI study coach that slides up over the current screen.
 * Chips jump to the matching tool; typed or spoken questions are answered inline
 * (same conversation as the full AI Tutor, which can be opened from the header).
 */
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View, KeyboardAvoidingView, Platform, TextInput as RNInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Maximize2, Mic, MicOff, Send, X } from 'lucide-react-native';
import { aiApi, getErrorMessage } from '../services/api';
import { useSpeechRecognition } from '../hooks/useSpeech';
import { useI18n } from '../context/I18nContext';
import { useTheme } from '../context/ThemeContext';
import { BotIcon } from './Brand';
import { Markdown } from './Misc';
import { Txt, Row } from './Ui';

export default function AssistantSheet({ open, onClose, initialPrompt }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const mic = useSpeechRecognition({ continuous: false });

  useEffect(() => {
    if (mic.transcript) { setInput((v) => `${v}${v ? ' ' : ''}${mic.transcript}`); mic.reset(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mic.transcript]);

  useEffect(() => {
    if (open && initialPrompt) send(initialPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => { setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80); }, [messages, sending]);

  async function send(textArg) {
    const text = (textArg ?? input).trim();
    if (!text || sending) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text, id: `u${Date.now()}` }]);
    setSending(true);
    try {
      const res = await aiApi.chat({ message: text, conversationId: conversationId || undefined });
      setConversationId(res.conversationId);
      setMessages((m) => [...m, { role: 'ai', text: res.exchange.response, id: `a${res.exchange.id}` }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'error', text: getErrorMessage(err), id: `e${Date.now()}` }]);
    } finally {
      setSending(false);
    }
  }

  const go = (name, params) => { onClose(); navigation.navigate(name, params); };

  const CHIPS = [
    { emoji: '📚', label: t('assistant.summarize'), run: () => go('Summarize') },
    { emoji: '🎯', label: t('assistant.flashcards'), run: () => go('CreateFlashcards') },
    { emoji: '📝', label: t('assistant.quiz'), run: () => go('QuizSetup') },
    { emoji: '💡', label: t('assistant.explain'), run: () => { setInput(`${t('assistant.explainPrefix')} `); inputRef.current?.focus(); } },
  ];

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }} onPress={onClose}>
          <Pressable onPress={() => {}} style={{ height: '82%', backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }}>
            <View style={{ backgroundColor: colors.primary, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: '#0b1220', alignItems: 'center', justifyContent: 'center' }}><BotIcon size={30} /></View>
              <View style={{ flex: 1 }}>
                <Txt size="lg" bold color="#fff">StudyAI</Txt>
                <Txt size="sm" color="#dbeafe">{t('assistant.subtitle')}</Txt>
              </View>
              {conversationId ? <Pressable onPress={() => go('Tutor', { conversationId })} hitSlop={8}><Maximize2 size={18} color="#fff" /></Pressable> : null}
              <Pressable onPress={onClose} hitSlop={8}><X size={22} color="#fff" /></Pressable>
            </View>

            <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
              {messages.length === 0 ? (
                <View style={{ alignItems: 'center', gap: 8, paddingVertical: 20 }}>
                  <Txt size="hero">👋</Txt>
                  <Txt size="h2" bold>{t('assistant.hi')}</Txt>
                  <Txt color="text2" center>{t('assistant.intro')}</Txt>
                  <Row wrap gap={8} style={{ justifyContent: 'center', marginTop: 8 }}>
                    {CHIPS.map((c) => (
                      <Pressable key={c.label} onPress={c.run} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.primarySoft }}>
                        <Txt size="sm" bold color="primary">{c.emoji} {c.label}</Txt>
                      </Pressable>
                    ))}
                  </Row>
                </View>
              ) : messages.map((m) => (
                <View key={m.id} style={{ flexDirection: 'row', gap: 8, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {m.role !== 'user' ? <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: '#0b1220', alignItems: 'center', justifyContent: 'center' }}><BotIcon size={18} /></View> : null}
                  <View style={{ maxWidth: '82%', padding: 12, borderRadius: 18, backgroundColor: m.role === 'user' ? colors.primary : m.role === 'error' ? colors.dangerSoft : colors.surface2 }}>
                    {m.role === 'ai' ? <Markdown>{m.text}</Markdown> : <Txt color={m.role === 'user' ? '#fff' : 'danger'}>{m.text}</Txt>}
                  </View>
                </View>
              ))}
              {sending ? <ActivityIndicator color={colors.primary} style={{ alignSelf: 'flex-start', marginLeft: 36 }} /> : null}
            </ScrollView>

            <Row style={{ padding: 12, paddingBottom: Math.max(insets.bottom, 12), borderTopWidth: 1, borderTopColor: colors.border }}>
              {mic.supported ? (
                <Pressable onPress={mic.listening ? mic.stop : mic.start} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: mic.listening ? colors.danger : colors.primarySoft, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Voice input">
                  {mic.listening ? <MicOff size={20} color="#fff" /> : <Mic size={20} color={colors.primary} />}
                </Pressable>
              ) : null}
              <RNInput
                ref={inputRef}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => send()}
                placeholder={t('assistant.placeholder')}
                placeholderTextColor={colors.muted}
                maxLength={8000}
                style={{ flex: 1, height: 44, borderRadius: 22, paddingHorizontal: 16, backgroundColor: colors.surface2, color: colors.text, fontSize: 15 }}
              />
              <Pressable onPress={() => send()} disabled={!input.trim() || sending} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: !input.trim() || sending ? 0.5 : 1 }} accessibilityLabel="Send">
                <Send size={19} color="#fff" />
              </Pressable>
            </Row>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
