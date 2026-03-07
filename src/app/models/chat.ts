// models/chat.ts
export interface ChatMessageDto {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  receiverId: string;
  receiverName: string;
  content: string;
  status: MessageStatus;
  sentAt: Date;
  readAt: Date | null;
}

export interface BusinessMemberDto {
  userId: string;
  fullName: string;
  profilePicture: string | null;
  role: string;
}

export enum MessageStatus {
  Sent = 1,
  Delivered = 2,
  Read = 3
}