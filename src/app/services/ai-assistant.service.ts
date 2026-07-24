import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { AIResponseDto, AiConversationDto, AiMessageDto, UserChatMessage } from '../models/user-chat-message';
import { Observable } from 'rxjs';
import { AiSignalrService } from './ai-signalr.service';

@Injectable({
  providedIn: 'root',
})
export class AiAssistantService {
  private http = inject(HttpClient);
  private aiSignalrService = inject(AiSignalrService);
  private baseUrl = `${environment.apiUrl}/AIAssistant`;

  /**
   * Send a message using SignalR streaming.
   * This will invoke SendAiMessage on the hub and stream chunks via ReceiveAiStreamChunk
   */
  sendMessageStream(message: UserChatMessage): Promise<void> {
    return this.aiSignalrService.sendAiMessage(message);
  }

  /**
   * Get the stream of chunks as an Observable
   */
  getStreamChunks() {
    return this.aiSignalrService.streamChunkReceived$.asObservable();
  }

  /**
   * Legacy HTTP-based sendMessage - kept for backward compatibility if needed
   */
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

