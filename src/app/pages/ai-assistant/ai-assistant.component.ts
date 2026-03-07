import { Component, inject, OnInit, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiAssistantService } from '../../services/ai-assistant.service';
import { ChatHistoryItem, UserChatMessage } from '../../models/user-chat-message';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-assistant.component.html',
  styleUrl: './ai-assistant.component.css'
})
export class AiAssistantComponent implements AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  private aiService = inject(AiAssistantService);

  messages: ChatMessage[] = [
    {
      role: 'assistant',
      content: 'Zdravo! Ja sam tvoj Pausalio asistent. 👋\n\nTu sam da ti pomognem sa svim pitanjima vezanim za tvoje poslovanje — fakture, troškove, poreze, paušalni limit i slično.\n\nŠta te zanima?',
      timestamp: new Date()
    }
  ];

  inputText = '';
  isLoading = false;
  private shouldScroll = false;

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  sendMessage() {
    const text = this.inputText.trim();
    if (!text || this.isLoading) return;

    this.messages.push({ role: 'user', content: text, timestamp: new Date() });
    this.inputText = '';
    this.isLoading = true;
    this.shouldScroll = true;

    const history: ChatHistoryItem[] = this.messages
      .slice(1, -1) // preskoči welcome poruku i poslednju korisnikovu
      .slice(-10)   // max 10 poruka istorije
      .map(m => ({ role: m.role, content: m.content }));

    const payload: UserChatMessage = { message: text, history };

    this.aiService.sendMessage(payload).subscribe({
      next: (response) => {
        this.messages.push({
          role: 'assistant',
          content: response.message ?? 'Nema odgovora.',
          timestamp: new Date()
        });
        this.isLoading = false;
        this.shouldScroll = true;
      },
      error: () => {
        this.messages.push({
          role: 'assistant',
          content: '⚠️ Došlo je do greške. Pokušaj ponovo.',
          timestamp: new Date()
        });
        this.isLoading = false;
        this.shouldScroll = true;
      }
    });
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat() {
    this.messages = [this.messages[0]];
  }

  private scrollToBottom() {
    try {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch {}
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('sr-Latn', { hour: '2-digit', minute: '2-digit' });
  }

  formatContent(content: string): string {
    return content.replace(/\n/g, '<br>');
  }
}