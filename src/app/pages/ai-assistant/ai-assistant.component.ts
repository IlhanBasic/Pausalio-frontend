import { Component, inject, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
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
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './ai-assistant.component.html',
  styleUrl: './ai-assistant.component.css',
})
export class AiAssistantComponent implements AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  private aiService = inject(AiAssistantService);
  private translate = inject(TranslateService);

  messages: ChatMessage[] = [
    {
      role: 'assistant',
      content: this.translate.instant('AI_ASSISTANT.WELCOME_MESSAGE'),
      timestamp: new Date(),
    },
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
      .slice(-10) // max 10 poruka istorije
      .map((m) => ({ role: m.role, content: m.content }));

    const payload: UserChatMessage = { message: text, history };

    this.aiService.sendMessage(payload).subscribe({
      next: (response) => {
        this.messages.push({
          role: 'assistant',
          content: response.message ?? this.translate.instant('AI_ASSISTANT.NO_RESPONSE'),
          timestamp: new Date(),
        });
        this.isLoading = false;
        this.shouldScroll = true;
      },
      error: () => {
        this.messages.push({
          role: 'assistant',
          content: this.translate.instant('AI_ASSISTANT.ERROR_MESSAGE'),
          timestamp: new Date(),
        });
        this.isLoading = false;
        this.shouldScroll = true;
      },
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
    return date.toLocaleTimeString(this.translate.currentLang === 'sr-Cyrl' ? 'sr-Cyrl-RS' : 'sr-Latn-RS', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  formatContent(content: string): string {
    return content.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  }
}