/**
 * AI Tutor - full chat interface. Conversations are saved on the server; "New chat" starts a fresh one,
 * and the history sheet lets the student reopen or delete old chats.
 * Route params: { conversationId } reopen a chat, { prompt } sends that question immediately,
 * { materialId } makes the tutor answer using that study material.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput as RNInput, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, FileText, History, MessageSquare, Mic, MicOff, Plus, SendHorizontal, Trash2, X } from 'lucide-react-native';
import { aiApi, getErrorMessage, materialApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useSpeechRecognition } from '../hooks/useSpeech';
import { BotIcon } from '../components/Brand';
import { AiNotice, Markdown } from '../components/Misc';
import { Button, Card, ConfirmDialog, IconButton, Row, Sheet, Spinner, Txt } from '../components/Ui';
import { TUTOR_SUGGESTIONS } from '../utils/constants';
import { timeAgo } from '../utils/format';

export function AITutorScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const toast = useToast();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = route.params || {};

  const [conversationId, setConversationId] = useState(params.conversationId || null);
  const [materialId, setMaterialId] = useState(params.materialId || null);
  const [materialName, setMaterialName] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [conversations, setConversations] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const mic = useSpeechRecognition({ continuous: false });

  const scrollRef = useRef(null);
  const autoSent = useRef(false);
  const scrollToBottom = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

  useEffect(() => {
    if (mic.transcript) { setInput((v) => `${v}${v ? ' ' : ''}${mic.transcript}`); mic.reset(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mic.transcript]);

  // Load an existing conversation
  useEffect(() => {
    if (!conversationId || messages.length) return undefined;
    let cancelled = false;
    setLoadingThread(true);
    aiApi.conversation(conversationId).then((res) => {
      if (cancelled) return;
      setMessages(res.messages.flatMap((m) => [{ role: 'user', text: m.message, id: `u${m.id}` }, { role: 'ai', text: m.response, id: `a${m.id}` }]));
      scrollToBottom();
    }).catch((err) => !cancelled && toast.error(getErrorMessage(err))).finally(() => !cancelled && setLoadingThread(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    if (!materialId) return;
    materialApi.get(materialId).then((r) => setMaterialName(r.analysis?.title || r.material.filename)).catch(() => setMaterialId(null));
  }, [materialId]);

  const send = useCallback(async (textArg) => {
    const text = (textArg ?? input).trim();
    if (!text || sending) return;
    setInput('');
    setMessages((m) => [...m.filter((x) => x.role !== 'error'), { role: 'user', text, id: `tmp${Date.now()}` }]);
    setSending(true);
    scrollToBottom();
    try {
      const res = await aiApi.chat({ message: text, conversationId: conversationId || undefined, materialId: materialId || undefined });
      setConversationId(res.conversationId);
      setMessages((m) => [...m, { role: 'ai', text: res.exchange.response, id: `a${res.exchange.id}` }]);
      setConversations(null);
    } catch (err) {
      setMessages((m) => [...m, { role: 'error', text: getErrorMessage(err), id: `e${Date.now()}`, retry: text }]);
    } finally {
      setSending(false);
      scrollToBottom();
    }
  }, [input, sending, conversationId, materialId]);

  // Question passed from another screen (Home, Help)
  useEffect(() => {
    if (params.prompt && !autoSent.current) {
      autoSent.current = true;
      send(params.prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const newChat = () => { setConversationId(null); setMessages([]); setMaterialId(null); setDrawerOpen(false); };

  const openDrawer = async () => {
    setDrawerOpen(true);
    if (!conversations) {
      try {
        const res = await aiApi.conversations();
        setConversations(res.conversations);
      } catch (err) {
        toast.error(getErrorMessage(err));
        setConversations([]);
      }
    }
  };

  const openConversation = (id) => {
    if (id === conversationId) return setDrawerOpen(false);
    setMessages([]);
    setMaterialId(null);
    setConversationId(id);
    return setDrawerOpen(false);
  };

  const deleteConversation = async (id) => {
    try {
      await aiApi.deleteConversation(id);
      setConversations((c) => c.filter((x) => x.conversationId !== id));
      if (id === conversationId) newChat();
      toast.success('Conversation deleted');
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const clearAll = async () => {
    try {
      await aiApi.clearHistory();
      setConversations([]);
      newChat();
      toast.success('Chat history cleared');
    } catch (err) { toast.error(getErrorMessage(err)); } finally { setConfirmClear(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 14, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <IconButton icon={ArrowLeft} size={38} onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Tabs'))} label="Go back" />
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#0b1220', alignItems: 'center', justifyContent: 'center' }}><BotIcon size={28} /></View>
        <View style={{ flex: 1 }}>
          <Txt bold>StudyAI Tutor</Txt>
          <Txt size="xs" color="muted">{sending ? 'Thinking…' : 'Your personal AI study coach'}</Txt>
        </View>
        <IconButton icon={Plus} size={38} onPress={newChat} label="New chat" />
        <IconButton icon={History} size={38} onPress={openDrawer} label="Chat history" />
      </View>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {loadingThread ? <View style={{ padding: 40 }}><Spinner /></View> : messages.length === 0 && !sending ? (
          <View style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
            <Txt style={{ fontSize: 48 }}>👋</Txt>
            <Txt size="h2" bold>{"Hi! I'm StudyAI"}</Txt>
            <Txt color="text2" center style={{ maxWidth: 320 }}>Your personal AI study assistant. Ask me to explain a concept, solve a problem step by step, or plan your revision.</Txt>
            <Row wrap gap={8} style={{ justifyContent: 'center', marginTop: 8 }}>
              {TUTOR_SUGGESTIONS.map((s) => (
                <Pressable key={s.text} onPress={() => send(s.text)} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
                  <Txt size="sm">{s.emoji} {s.text}</Txt>
                </Pressable>
              ))}
            </Row>
          </View>
        ) : messages.map((m) => (m.role === 'user' ? (
          <View key={m.id} style={{ alignItems: 'flex-end' }}>
            <View style={{ maxWidth: '84%', padding: 12, borderRadius: 18, borderBottomRightRadius: 6, backgroundColor: colors.primary }}><Txt color="#fff" selectable>{m.text}</Txt></View>
          </View>
        ) : (
          <View key={m.id} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: '#0b1220', alignItems: 'center', justifyContent: 'center' }}><BotIcon size={20} /></View>
            <View style={{ flex: 1, maxWidth: '88%', padding: 12, borderRadius: 18, borderTopLeftRadius: 6, backgroundColor: m.role === 'error' ? colors.dangerSoft : colors.surface, borderWidth: 1, borderColor: colors.border }}>
              {m.role === 'error' ? (
                <View style={{ gap: 8 }}>
                  <Txt color="danger">{m.text}</Txt>
                  <Button size="sm" variant="secondary" onPress={() => { setMessages((all) => all.filter((x) => x.id !== m.id && x.text !== m.retry)); send(m.retry); }}>Retry</Button>
                </View>
              ) : <Markdown>{m.text}</Markdown>}
            </View>
          </View>
        )))}
        {sending ? (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: '#0b1220', alignItems: 'center', justifyContent: 'center' }}><BotIcon size={20} /></View>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}
      </ScrollView>

      {materialId && materialName ? (
        <Row style={{ marginHorizontal: 16, marginBottom: 8, backgroundColor: colors.primarySoft, borderRadius: 14, padding: 10 }}>
          <FileText size={16} color={colors.primary} />
          <Txt size="sm" color="primary" style={{ flex: 1 }} numberOfLines={1}>Answering from: {materialName}</Txt>
          <Pressable onPress={() => setMaterialId(null)} hitSlop={8}><X size={16} color={colors.primary} /></Pressable>
        </Row>
      ) : null}
      <View style={{ paddingHorizontal: 16 }}><AiNotice /></View>
      {mic.error ? <Txt size="xs" color="danger" style={{ paddingHorizontal: 16 }}>{mic.error}</Txt> : null}

      <Row style={{ padding: 12, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
        <RNInput
          value={mic.interim ? `${input}${input ? ' ' : ''}${mic.interim}` : input}
          onChangeText={setInput}
          multiline
          placeholder={mic.listening ? 'Listening…' : 'Ask StudyAI anything...'}
          placeholderTextColor={colors.muted}
          maxLength={8000}
          style={{ flex: 1, maxHeight: 120, minHeight: 44, borderRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: colors.surface2, color: colors.text, fontSize: 15 }}
        />
        {mic.supported ? <IconButton icon={mic.listening ? MicOff : Mic} size={44} bg={mic.listening ? colors.danger : colors.primarySoft} color={mic.listening ? '#fff' : colors.primary} onPress={mic.listening ? mic.stop : mic.start} label="Voice input" /> : null}
        <IconButton icon={SendHorizontal} size={44} bg={colors.primary} color="#fff" onPress={() => send()} label="Send message" style={{ opacity: !input.trim() || sending ? 0.5 : 1 }} />
      </Row>

      <Sheet open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Chat History">
        <Button block icon={Plus} onPress={newChat}>New Chat</Button>
        <ScrollView style={{ maxHeight: 340 }}>
          {conversations === null ? <View style={{ padding: 20 }}><Spinner /></View> : conversations.length === 0 ? <Txt size="sm" color="muted" center style={{ padding: 20 }}>No saved chats yet.</Txt> : conversations.map((c) => (
            <Row key={c.conversationId} style={{ paddingVertical: 6 }}>
              <Pressable onPress={() => openConversation(c.conversationId)} style={{ flex: 1, flexDirection: 'row', gap: 10, alignItems: 'center', padding: 10, borderRadius: 14, backgroundColor: c.conversationId === conversationId ? colors.primarySoft : 'transparent' }}>
                <MessageSquare size={17} color={colors.text2} />
                <View style={{ flex: 1 }}>
                  <Txt size="sm" bold numberOfLines={1}>{c.title}</Txt>
                  <Txt size="xs" color="muted">{timeAgo(c.lastMessageAt)} · {c.messageCount} messages</Txt>
                </View>
              </Pressable>
              <IconButton icon={Trash2} size={36} bg="transparent" color={colors.danger} onPress={() => deleteConversation(c.conversationId)} label="Delete conversation" />
            </Row>
          ))}
        </ScrollView>
        {conversations?.length > 0 ? <Button variant="danger" size="sm" icon={Trash2} onPress={() => setConfirmClear(true)}>Clear all history</Button> : null}
      </Sheet>

      <ConfirmDialog open={confirmClear} title="Clear all chats?" message="This permanently deletes every AI Tutor conversation." confirmLabel="Clear history" onConfirm={clearAll} onCancel={() => setConfirmClear(false)} />
    </KeyboardAvoidingView>
  );
}
