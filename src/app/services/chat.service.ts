// services/chat.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { BusinessMemberDto, ChatMessageDto } from '../models/chat';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/Chat`;

  getMembers(): Observable<BusinessMemberDto[]> {
    return this.http.get<BusinessMemberDto[]>(`${this.baseUrl}/members`);
  }

  getHistory(otherUserId: string, page = 1, pageSize = 30): Observable<ChatMessageDto[]> {
    return this.http.get<ChatMessageDto[]>(
      `${this.baseUrl}/history/${otherUserId}?page=${page}&pageSize=${pageSize}`
    );
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/unread-count`);
  }
}