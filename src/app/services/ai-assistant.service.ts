import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { AIResponseDto, UserChatMessage } from '../models/user-chat-message';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AiAssistantService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/AIAssistant`;

  sendMessage(message: UserChatMessage): Observable<AIResponseDto> {
    return this.http.post<AIResponseDto>(this.baseUrl, message);
  }
}

