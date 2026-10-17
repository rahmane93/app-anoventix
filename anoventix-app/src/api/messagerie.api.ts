import type {
    ConversationDTO,
    ConversationListResponse,
    CreateConversationRequest,
    MessageDTO,
    MessageListResponse,
    MotifSignalementMessage,
    SendMessageRequest,
} from '../types/messagerie.types';
import { apiClient } from './client';

export const createConversation = async (
  data: CreateConversationRequest,
): Promise<ConversationDTO> => {
  const response = await apiClient.post<ConversationDTO>('/api/messagerie/conversations', data);
  return response.data;
};

export const getConversations = async (params?: {
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}): Promise<ConversationListResponse> => {
  const response = await apiClient.get<ConversationListResponse>('/api/messagerie/conversations', {
    params: {
      page: params?.page ?? 0,
      size: params?.size ?? 10,
      sort: params?.sort ?? 'lastMessageAt',
      direction: params?.direction ?? 'desc',
    },
  });
  return response.data;
};

export const getConversationById = async (conversationId: string | number): Promise<ConversationDTO> => {
  const response = await apiClient.get<ConversationDTO>(`/api/messagerie/conversations/${conversationId}`);
  return response.data;
};

export const getConversationMessages = async (
  conversationId: string | number,
  params?: {
    page?: number;
    size?: number;
    sort?: string;
    direction?: 'asc' | 'desc';
  },
): Promise<MessageListResponse> => {
  const response = await apiClient.get<MessageListResponse>(`/api/messagerie/conversations/${conversationId}/messages`, {
    params: {
      page: params?.page ?? 0,
      size: params?.size ?? 20,
      sort: params?.sort ?? 'createdAt',
      direction: params?.direction ?? 'asc',
    },
  });
  return response.data;
};

export const sendConversationMessage = async (
  conversationId: string | number,
  data: SendMessageRequest,
): Promise<MessageDTO> => {
  const response = await apiClient.post<MessageDTO>(
    `/api/messagerie/conversations/${conversationId}/messages`,
    data,
  );
  return response.data;
};

export const markConversationAsRead = async (conversationId: string | number): Promise<void> => {
  await apiClient.put(`/api/messagerie/conversations/${conversationId}/read`);
};

export const signalerMessage = async (
  messageId: string | number,
  motif: MotifSignalementMessage,
): Promise<void> => {
  await apiClient.post(`/api/messagerie/messages/${messageId}/signaler`, { motif });
};
