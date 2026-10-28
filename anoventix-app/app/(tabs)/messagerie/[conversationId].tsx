import { AlertBanner } from '@/src/components/ui/alert-banner';
import { Button } from '@/src/components/ui/button';
import * as messagerieApi from '@/src/api/messagerie.api';
import { definirConversationOuverte } from '@/src/lib/push';
import { useAuthStore } from '@/src/stores/auth.store';
import { useMessagerieStore } from '@/src/stores/messagerie.store';
import { colors, radius, shadows, spacing, typography } from '@/src/theme';
import {
    MOTIF_SIGNALEMENT_MESSAGE_LABELS,
    type MessageDTO,
    type MotifSignalementMessage,
} from '@/src/types/messagerie.types';
import { getErrorMessage } from '@/src/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Stack, router, useFocusEffect, useLocalSearchParams, useSegments } from 'expo-router';
import { useBreakpoint, webColumnStyle } from '@/src/lib/responsive';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    AppState,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import AppText from '@/src/components/AppText';
import AppTextInput from '@/src/components/AppTextInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appAlert } from '@/src/components/ui/app-alert';
import { useShallow } from 'zustand/react/shallow';

function getPeerName(name?: string | null, username?: string | null): string {
  return name || username || 'Conversation';
}

function getMessageText(message: MessageDTO): string {
  return message.content ?? '';
}

function toLocalDate(raw: string): Date {
  // Si le serveur omet le suffixe timezone (ex: "2025-01-01T10:00:00"), on force
  // l'interprétation UTC pour que toLocaleTimeString affiche l'heure locale correcte.
  const normalized = /Z|[+-]\d{2}:\d{2}$/.test(raw) ? raw : raw + 'Z';
  return new Date(normalized);
}

function formatMessageTime(message: MessageDTO): string {
  const raw = message.createdAt;
  if (!raw) return '';
  const date = toLocalDate(raw);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/**
 * Zone de saisie : possède son propre brouillon, pour qu'une frappe ne re-rende
 * que ce composant et pas tout l'écran (liste des messages comprise).
 */
function Composer({
  bottomInset,
  disabled,
  onSend,
  onFocus,
}: {
  bottomInset: number;
  disabled: boolean;
  onSend: (content: string) => void;
  onFocus: () => void;
}) {
  const [draft, setDraft] = useState('');
  const canSend = draft.trim().length > 0 && !disabled;

  const send = () => {
    const content = draft.trim();
    if (!content || disabled) return;
    setDraft('');
    onSend(content);
  };

  return (
    <View style={[styles.composerWrap, { paddingBottom: Math.max(bottomInset, spacing.sm) }]}>
      <View style={styles.composerBox}>
        <AppTextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Écrivez votre message…"
          placeholderTextColor={colors.placeholder}
          multiline
          onFocus={onFocus}
          // Web : Entrée envoie, Maj+Entrée passe à la ligne (comme les messageries habituelles).
          onKeyPress={(e) => {
            const ev = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
            if (Platform.OS === 'web' && ev.key === 'Enter' && !ev.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          style={styles.input}
        />
        <Button
          title=""
          accessibilityLabel="Envoyer le message"
          size="sm"
          disabled={!canSend}
          onPress={send}
          leftIcon={<Ionicons name="send" size={18} color={colors.white} />}
          style={styles.sendBtn}
        />
      </View>
    </View>
  );
}

export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { isAuthenticated } = useAuthStore(useShallow((s) => ({ isAuthenticated: s.isAuthenticated })));
  const insets = useSafeAreaInsets();
  // Web desktop, hors maître-détail (ouverte depuis une fiche) : colonne de lecture.
  const { isDesktop } = useBreakpoint();
  const inTabs = useSegments()[0] === '(tabs)';
  const {
    currentConversation,
    messages,
    isLoadingConversation,
    isLoadingMoreMessages,
    error,
    peerOnline,
    messagesCurrentPage,
    messagesTotalPages,
    loadConversation,
    loadMoreMessages,
    sendMessage,
    changerEtatConversation,
    basculerBlocage,
    retryMessage,
    clearCurrentConversation,
    fetchInitialPresence,
    pollMessages,
  } = useMessagerieStore(
    useShallow((s) => ({
      currentConversation: s.currentConversation,
      messages: s.messages,
      isLoadingConversation: s.isLoadingConversation,
      isLoadingMoreMessages: s.isLoadingMoreMessages,
      error: s.error,
      peerOnline: s.peerOnline,
      messagesCurrentPage: s.messagesCurrentPage,
      messagesTotalPages: s.messagesTotalPages,
      loadConversation: s.loadConversation,
      loadMoreMessages: s.loadMoreMessages,
      sendMessage: s.sendMessage,
      changerEtatConversation: s.changerEtatConversation,
      basculerBlocage: s.basculerBlocage,
      retryMessage: s.retryMessage,
      clearCurrentConversation: s.clearCurrentConversation,
      fetchInitialPresence: s.fetchInitialPresence,
      pollMessages: s.pollMessages,
    })),
  );
  const hasMoreMessages = messagesCurrentPage + 1 < messagesTotalPages;
  const [signalingId, setSignalingId] = useState<number | null>(null);
  const listRef = useRef<FlatList<MessageDTO>>(null);
  // Le store maintient déjà les messages triés par date croissante.
  const orderedMessages = messages;

  const scrollToBottom = (animated = true) => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated });
      }, 60);
    });
  };

  useEffect(() => {
    if (!conversationId) return;
    loadConversation(conversationId);
    return () => { clearCurrentConversation(); };
  }, [conversationId, clearCurrentConversation, loadConversation]);

  // Polling uniquement quand l'écran a le focus et que l'app est au premier plan :
  // les onglets restent montés, un simple useEffect continuerait en arrière-plan.
  // Conversation à l'écran : ses notifications ne s'affichent pas par-dessus (RG-06-22).
  useFocusEffect(
    useCallback(() => {
      definirConversationOuverte(conversationId ?? null);
      return () => definirConversationOuverte(null);
    }, [conversationId]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!conversationId) return;
      let id: ReturnType<typeof setInterval> | null = null;
      const start = () => {
        if (id) return;
        id = setInterval(() => pollMessages(conversationId), 5_000);
      };
      const stop = () => {
        if (id) clearInterval(id);
        id = null;
      };
      if (AppState.currentState === 'active') start();
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          pollMessages(conversationId);
          start();
        } else {
          stop();
        }
      });
      return () => {
        stop();
        sub.remove();
      };
    }, [conversationId, pollMessages]),
  );

  useEffect(() => {
    const peerId = currentConversation?.otherParticipantId;
    if (!peerId) return;
    fetchInitialPresence(peerId);
  }, [currentConversation?.otherParticipantId, fetchInitialPresence]);

  // Descend en bas seulement quand un message arrive à la fin : le chargement
  // de l'historique (ajouté en tête) ne doit pas ramener l'utilisateur en bas.
  const lastMessageId = orderedMessages[orderedMessages.length - 1]?.id;
  const initialScrollDone = useRef(false);
  useEffect(() => {
    initialScrollDone.current = false;
  }, [conversationId]);
  useEffect(() => {
    if (lastMessageId != null && initialScrollDone.current) scrollToBottom(true);
  }, [lastMessageId]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      scrollToBottom(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {});

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const peerName = useMemo(
    () => getPeerName(currentConversation?.otherParticipantNomComplet, currentConversation?.otherParticipantUsername),
    [currentConversation?.otherParticipantNomComplet, currentConversation?.otherParticipantUsername],
  );
  const handleSend = (content: string) => {
    if (!conversationId) return;
    // Échec : la bulle passe en « Non envoyé · Réessayer », le texte n'est pas perdu.
    sendMessage(conversationId, content);
  };

  const signaler = async (msg: MessageDTO, motif: MotifSignalementMessage) => {
    setSignalingId(msg.id);
    try {
      await messagerieApi.signalerMessage(msg.id, motif);
      appAlert('Signalement envoyé', 'Ce message a été signalé à la modération.');
    } catch (e) {
      appAlert("Signalement non envoyé", getErrorMessage(e, 'Impossible de signaler ce message.'));
    } finally {
      setSignalingId(null);
    }
  };

  // Le motif est obligatoire : un appui sur un motif envoie le signalement.
  const handleLongPressMessage = (msg: MessageDTO) => {
    if (msg.mine) return;
    appAlert(
      'Signaler ce message',
      'Pourquoi ce message pose-t-il problème ?',
      [
        ...(Object.keys(MOTIF_SIGNALEMENT_MESSAGE_LABELS) as MotifSignalementMessage[]).map((motif) => ({
          text: MOTIF_SIGNALEMENT_MESSAGE_LABELS[motif],
          onPress: () => { signaler(msg, motif); },
        })),
        { text: 'Annuler', style: 'cancel' as const },
      ],
    );
  };

  const ecritureImpossible = currentConversation?.ecriturePossible === false;
  const bloqueParMoi = currentConversation?.bloqueParMoi === true;

  const confirmerSuppression = () => {
    if (!conversationId) return;
    appAlert('Supprimer la conversation', "Elle disparaîtra de votre boîte ; votre interlocuteur la conserve.", [
      { text: 'Annuler', style: 'cancel' as const },
      {
        text: 'Supprimer',
        style: 'destructive' as const,
        onPress: () => {
          changerEtatConversation(conversationId, 'supprimer')
            .then(() => router.replace('/(tabs)/messagerie'))
            .catch(() => {});
        },
      },
    ]);
  };

  const ouvrirMenu = () => {
    if (!conversationId || !currentConversation) return;
    const archivee = currentConversation.etat === 'ARCHIVEE';
    appAlert(peerName, undefined, [
      {
        text: archivee ? 'Restaurer' : 'Archiver',
        onPress: () => {
          changerEtatConversation(conversationId, archivee ? 'restaurer' : 'archiver')
            .then(() => router.replace('/(tabs)/messagerie'))
            .catch(() => {});
        },
      },
      {
        text: bloqueParMoi ? 'Débloquer cet utilisateur' : 'Bloquer cet utilisateur',
        onPress: () => {
          basculerBlocage(conversationId, currentConversation.otherParticipantId, !bloqueParMoi).catch(() => {});
        },
      },
      { text: 'Supprimer la conversation', style: 'destructive' as const, onPress: confirmerSuppression },
      { text: 'Annuler', style: 'cancel' as const },
    ]);
  };

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/messagerie'))}
              style={styles.headerBackBtn}
              accessibilityRole="button"
              accessibilityLabel="Retour aux conversations"
            >
              <Ionicons name="chevron-back" size={24} color={colors.headerText} />
            </TouchableOpacity>
          ),
          headerTitle: () => (
            <View style={styles.headerTitleWrap}>
              <AppText style={styles.headerTitleText} numberOfLines={1}>{peerName}</AppText>
              {peerOnline !== null && (
                <View style={styles.headerStatusRow}>
                  <View style={[styles.presenceDot, peerOnline ? styles.presenceDotOnline : styles.presenceDotOffline]} />
                  <AppText style={[styles.headerStatusText, peerOnline ? styles.headerStatusOnline : styles.headerStatusOffline]}>
                    {peerOnline ? 'En ligne' : 'Hors ligne'}
                  </AppText>
                </View>
              )}
            </View>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={ouvrirMenu}
              style={styles.headerBackBtn}
              accessibilityRole="button"
              accessibilityLabel="Actions de la conversation"
            >
              <Ionicons name="ellipsis-vertical" size={22} color={colors.headerText} />
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={[styles.flex, isDesktop && !inTabs && webColumnStyle('form')]}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
      >
        <View style={styles.contentWrap}>
          {error ? (
            <View style={styles.bannerWrap}>
              <AlertBanner message={error} variant="error" />
            </View>
          ) : null}

          {currentConversation?.annonceId ? (
            <TouchableOpacity
              style={styles.annonceCard}
              activeOpacity={0.75}
              onPress={() => router.push(`/annonce/${currentConversation.annonceId}` as any)}
            >
              <View style={styles.annonceIconWrap}>
                <Ionicons name="home-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.annonceInfo}>
                <AppText style={styles.annonceTitle} numberOfLines={1}>{currentConversation.annonceTitre ?? 'Annonce'}</AppText>
                {currentConversation.annonceReference ? (
                  <AppText style={styles.annonceRef}>Réf. {currentConversation.annonceReference}</AppText>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          ) : null}

          {isLoadingConversation && !currentConversation ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
              <AppText style={styles.loadingText}>Chargement de la conversation…</AppText>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              style={styles.messagesList}
              data={orderedMessages}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
              scrollEventThrottle={200}
              onScroll={(e) => {
                if (e.nativeEvent.contentOffset.y < 80 && hasMoreMessages && !isLoadingMoreMessages) {
                  loadMoreMessages(conversationId!);
                }
              }}
              ListHeaderComponent={(isLoadingMoreMessages
                  ? <ActivityIndicator size="small" color={colors.primary} style={styles.loadMoreIndicator} />
                  : null) ?? undefined}
              onContentSizeChange={() => {
                // Premier affichage : on se place sur le dernier message.
                if (!initialScrollDone.current && orderedMessages.length > 0) {
                  initialScrollDone.current = true;
                  scrollToBottom(false);
                }
              }}
              renderItem={({ item }) => {
                const isMine = item.mine;
                const isSignaling = signalingId === item.id;
                return (
                  <View style={[styles.messageRow, isMine ? styles.messageRowMine : styles.messageRowOther]}>
                    <View style={isMine ? styles.messageWrapMine : styles.messageWrapOther}>
                      <TouchableOpacity
                        style={[styles.messageBubble, isMine ? styles.messageBubbleMine : styles.messageBubbleOther, (isSignaling || item.status === 'sending') && { opacity: 0.5 }]}
                        onLongPress={() => { if (!item.status) handleLongPressMessage(item); }}
                        delayLongPress={400}
                        activeOpacity={0.85}
                      >
                        <AppText style={[styles.messageText, isMine ? styles.messageTextMine : styles.messageTextOther]}>
                          {getMessageText(item)}
                        </AppText>
                      </TouchableOpacity>
                      {item.status === 'failed' ? (
                        <TouchableOpacity
                          onPress={() => retryMessage(conversationId!, item.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityRole="button"
                          accessibilityLabel="Message non envoyé, réessayer"
                        >
                          <AppText style={[styles.messageMeta, styles.messageMetaMine, styles.messageMetaFailed]}>
                            Non envoyé · Réessayer
                          </AppText>
                        </TouchableOpacity>
                      ) : (
                        <AppText style={[styles.messageMeta, isMine ? styles.messageMetaMine : styles.messageMetaOther]}>
                          {item.status === 'sending' ? 'Envoi…' : formatMessageTime(item)}
                        </AppText>
                      )}
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.centeredEmpty}>
                  <Ionicons name="chatbubble-ellipses-outline" size={40} color={colors.textMuted} />
                  <AppText style={styles.emptyText}>Aucun message pour le moment.</AppText>
                </View>
              }
            />
          )}

          {ecritureImpossible ? (
            <View style={{ padding: spacing.base }}>
              <AlertBanner
                message={currentConversation?.ecritureImpossibleMotif ?? "Vous ne pouvez plus écrire dans cette conversation."}
                variant="info"
              />
            </View>
          ) : null}
          <Composer
            bottomInset={insets.bottom}
            disabled={!conversationId || ecritureImpossible}
            onSend={handleSend}
            onFocus={() => scrollToBottom(true)}
          />
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.white,
  },
  contentWrap: {
    flex: 1,
  },
  bannerWrap: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
  },
  annonceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    backgroundColor: colors.white,
    marginHorizontal: spacing.base,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
    padding: spacing.base,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.sm,
  },
  annonceIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  annonceInfo: {
    flex: 1,
    gap: 2,
  },
  annonceTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  annonceRef: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.base,
  },
  loadingText: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    gap: spacing.sm,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messagesList: {
    flex: 1,
  },
  messageRow: {
    flexDirection: 'row',
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageWrapMine: {
    alignItems: 'flex-end',
    maxWidth: '82%',
  },
  messageWrapOther: {
    alignItems: 'flex-start',
    maxWidth: '82%',
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
  },
  messageBubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: colors.bubbleReceived,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: typography.sizes.md,
    lineHeight: 22,
  },
  messageTextMine: {
    color: colors.white,
  },
  messageTextOther: {
    color: colors.textPrimary,
  },
  messageMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  messageMetaMine: {
    color: colors.textMuted,
    textAlign: 'right',
  },
  messageMetaFailed: {
    color: colors.errorText,
    fontWeight: '600',
  },
  messageMetaOther: {
    color: colors.textMuted,
    textAlign: 'left',
  },
  centeredEmpty: {
    paddingTop: spacing['3xl'],
    alignItems: 'center',
    gap: spacing.base,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
  },
  composerWrap: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    backgroundColor: colors.white,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 8,
  },
  composerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerBackBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  headerTitleWrap: {
    alignItems: 'flex-start',
  },
  headerTitleText: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.headerText,
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  presenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  // En-tête blanc : pastille vive + texte foncé (≥ 4.5:1).
  presenceDotOnline: {
    backgroundColor: colors.success,
  },
  presenceDotOffline: {
    backgroundColor: colors.border,
  },
  headerStatusText: {
    fontSize: typography.sizes.xs,
  },
  headerStatusOnline: {
    color: colors.successText,
  },
  headerStatusOffline: {
    color: colors.textMuted,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.background,
    borderWidth: 0,
    borderRadius: radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
  },
  loadMoreIndicator: {
    paddingVertical: spacing.sm,
    alignSelf: 'center',
  },
  sendBtn: {
    width: 52,
    minWidth: 52,
    height: 52,
    minHeight: 52,
    borderRadius: 26,
    paddingHorizontal: 0,
  },
});
