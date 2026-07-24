import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { AIResponseDto, AiConversationDto, AiMessageDto, UserChatMessage } from '../models/user-chat-message';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AiAssistantService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/AIAssistant`;

  sendMessage(message: UserChatMessage): Observable<AIResponseDto> {
    return this.http.post<AIResponseDto>(`${this.baseUrl}/send`, message);
  }

  getConversations(): Observable<AiConversationDto[]> {
    return this.http.get<AiConversationDto[]>(`${this.baseUrl}/conversations`);
  }

  getConversationMessages(conversationId: string): Observable<AiMessageDto[]> {
    return this.http.get<AiMessageDto[]>(`${this.baseUrl}/conversations/${conversationId}/messages`);
  }

  deleteConversation(conversationId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/conversations/${conversationId}`);
  }
}

