export interface ChatUser {
  uuid: string;
  name: string;
  picture_url: string | null;
}

export interface Conversation {
  uuid: string;
  other_user: ChatUser | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface Message {
  uuid: string;
  sender: ChatUser | null;
  text: string;
  type: string;
  data: Record<string, unknown> | null;
  created_at: string;
}
