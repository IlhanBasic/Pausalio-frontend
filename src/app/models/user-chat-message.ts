export class UserChatMessage
{
    public message: string | null = null;
    public history: Array<ChatHistoryItem> = new Array<ChatHistoryItem>();
    public conversationId?: string | null = null;
}

export class ChatHistoryItem
{
    public role: string | null = null;
    public content: string | null = null;
}

export class AIResponseDto
{
    public message: string | null = null;
    public conversationId?: string | null = null;
    public usage?: any;
}

export class AiConversationDto {
    public id: string | null = null;
    public title: string | null = null;
    public createdAt: string | null = null;
    public updatedAt: string | null = null;
}

export class AiMessageDto {
    public id: string | null = null;
    public role: string | null = null;
    public content: string | null = null;
    public createdAt: string | null = null;
}
