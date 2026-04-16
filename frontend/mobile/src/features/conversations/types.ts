export type MessageType = 'text' | 'system' | 'tournament_proposal' | 'match_proposal';

export interface ConvUser {
  uuid: string;
  name: string;
  picture_url: string | null;
}

export interface Conversation {
  uuid: string;
  other_user: ConvUser;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface PrivateMessage {
  uuid: string;
  sender: ConvUser | null;
  text: string;
  type: MessageType;
  data: Record<string, unknown> | null;
  created_at: string;
}
