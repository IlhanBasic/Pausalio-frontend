export class UserChatMessage
{
    public message: string | null = null;
    public history: Array<ChatHistoryItem> = new Array<ChatHistoryItem>();
}

export class ChatHistoryItem
{
    public role: string | null = null;
    public content: string | null = null;
}

export class AIResponseDto
{
    public message: string | null = null;
}
