import api from '../utils/request';
import { getAssistantGuestId } from '../utils/storage';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  createdAt?: string;
}

export interface AssistantConversation {
  id: string;
  role: 'customer' | 'admin';
  title: string;
  messages: ChatMessage[];
}

const guestHeaders = () => ({ 'X-Assistant-Guest': getAssistantGuestId() });

/** Restaure la dernière conversation persistée (ou null). */
export const getConversation = async (): Promise<AssistantConversation | null> => {
  const { data } = await api.get<{ conversation: AssistantConversation | null }>(
    '/assistant/conversation',
    { headers: guestHeaders() }
  );
  return data.conversation;
};

/** Démarre une conversation vierge persistée. */
export const startConversation = async (): Promise<AssistantConversation> => {
  const { data } = await api.post<{ conversation: AssistantConversation }>(
    '/assistant/conversation',
    {},
    { headers: guestHeaders() }
  );
  return data.conversation;
};

/** Envoie un message et renvoie la conversation mise à jour. */
export const sendMessage = async (
  conversationId: string | null,
  text: string
): Promise<{ conversationId: string; reply: string; messages: ChatMessage[] }> => {
  const { data } = await api.post<{
    conversationId: string;
    reply: string;
    messages: ChatMessage[];
  }>(
    '/assistant/chat',
    { conversationId: conversationId ?? undefined, text },
    { headers: guestHeaders() }
  );
  return data;
};
