import api from '../utils/request';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

/** Envoie l'historique récent au backend (Gemini + outils MongoDB). */
export const sendChat = async (messages: ChatMessage[]): Promise<string> => {
  const { data } = await api.post<{ reply: string }>('/assistant/chat', { messages });
  return data.reply;
};
