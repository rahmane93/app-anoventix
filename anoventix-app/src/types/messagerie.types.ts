import type { PageResponse } from './annonce.types';

export interface MessageDTO {
  id: number;
  conversationId: number;
  senderId: string;
  senderUsername?: string | null;
  senderNomComplet: string;
  senderPhotoProfil: string | null;
  content: string;
  createdAt: string;
  readAt: string | null;
  mine: boolean;
  /** Côté client uniquement : message pas encore confirmé par le serveur. */
  status?: 'sending' | 'failed';
}

/** Motif d'un signalement de message (enum MotifSignalementMessage côté API). */
export type MotifSignalementMessage = 'ARNAQUE' | 'PROPOS_INSULTANTS' | 'HARCELEMENT' | 'SPAM' | 'AUTRE';

export const MOTIF_SIGNALEMENT_MESSAGE_LABELS: Record<MotifSignalementMessage, string> = {
  ARNAQUE: 'Arnaque / fraude',
  PROPOS_INSULTANTS: 'Propos insultants',
  HARCELEMENT: 'Harcèlement',
  SPAM: 'Spam / publicité',
  AUTRE: 'Autre',
};

export interface ConversationDTO {
  id: number;
  annonceId: number;
  annonceReference: string;
  annonceTitre: string;
  annonceActive: boolean;
  otherParticipantId: string;
  otherParticipantUsername?: string | null;
  otherParticipantNomComplet: string;
  otherParticipantPhotoProfil: string | null;
  createdById: string;
  lastMessagePreview: string | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  etat?: 'ACTIVE' | 'ARCHIVEE';
  bloqueParMoi?: boolean;
  /** Faux si l'interlocuteur est bloqué (ou nous a bloqué) : le composer est désactivé. */
  ecriturePossible?: boolean;
  ecritureImpossibleMotif?: string | null;
}

export interface UtilisateurBloque {
  id: string;
  nomComplet: string;
  photoProfil: string | null;
  dateBlocage: string;
}

export interface CreateConversationRequest {
  annonceId: number;
  /** Premier message envoyé à l'auteur de l'annonce. Requis par l'API. */
  message: string;
}

export interface SendMessageRequest {
  content: string;
}

export type ConversationListResponse = PageResponse<ConversationDTO>;
export type MessageListResponse = PageResponse<MessageDTO>;
