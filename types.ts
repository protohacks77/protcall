export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  isLoading?: boolean;
}
