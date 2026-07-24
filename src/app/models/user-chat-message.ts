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

export class AiStreamChunkDto
{
    public conversationId: string | null = null;
    public type: string | null = null;  // e.g., "content", "error"
    public content: string | null = null;
    public isFinal: boolean = false;
    public usage?: AIUsageDto;
}

export class AIUsageDto
{
    public promptTokens?: number;
    public completionTokens?: number;
    public totalTokens?: number;
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
