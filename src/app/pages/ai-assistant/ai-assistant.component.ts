import { Component, inject, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AiAssistantService } from '../../services/ai-assistant.service';
import { ChatHistoryItem, UserChatMessage } from '../../models/user-chat-message';
import { UserProfileStore } from '../../stores/user-profile.store';
import { UserProfileService } from '../../services/user-profile.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './ai-assistant.component.html',
  styleUrl: './ai-assistant.component.css',
})
export class AiAssistantComponent implements AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  private aiService = inject(AiAssistantService);
  private translate = inject(TranslateService);
  private userProfileStore = inject(UserProfileStore);
  private userProfileService = inject(UserProfileService);
  private fb = inject(FormBuilder);

  messages: ChatMessage[] = [
    {
      role: 'assistant',
      content: this.translate.instant('AI_ASSISTANT.WELCOME_MESSAGE'),
      timestamp: new Date(),
    },
  ];

  inputText = '';
  isLoading = false;
  showAiConfigModal = false;
  private shouldScroll = false;

  aiConfigForm = this.fb.group({
    openRouterApiKey: ['', Validators.required],
    openRouterModelName: ['', Validators.required],
  });

  get canUseAiAssistant(): boolean {
    const user = this.userProfileStore.Profile()?.userProfile;
    const apiKeyConfigured = Boolean(user?.isOpenRouterAPIKeySet ?? user?.isOpenRouterAPISet);
    const modelConfigured = Boolean(user?.isOpenRouterModelSet ?? user?.IsOpenRouterModelSet);
    return apiKeyConfigured && modelConfigured;
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  openAiConfigModal() {
    this.aiConfigForm.patchValue({
      openRouterApiKey: '',
      openRouterModelName: '',
    });
    this.showAiConfigModal = true;
  }

  closeAiConfigModal() {
    this.showAiConfigModal = false;
    this.aiConfigForm.reset();
  }

  saveAiConfiguration() {
    if (this.aiConfigForm.invalid) {
      this.aiConfigForm.markAllAsTouched();
      return;
    }

    const user = this.userProfileStore.Profile()?.userProfile;
    if (!user) return;

    this.isLoading = true;

    const payload = {
      firstName: user.firstName,
      lastName: user.lastName,
      profilePicture: user.profilePicture ?? null,
      phone: user.phone ?? null,
      city: user.city ?? '',
      address: user.address ?? null,
      openRouterApiKey: this.aiConfigForm.value.openRouterApiKey?.trim() || null,
      openRouterModelName: this.aiConfigForm.value.openRouterModelName?.trim() || null,
    };

    this.userProfileService.updateProfile(user.id, payload).subscribe({
      next: () => {
        this.userProfileStore.loadProfile().subscribe({
          next: () => {
            this.closeAiConfigModal();
            this.isLoading = false;
            this.shouldScroll = true;
          },
          error: () => {
            this.closeAiConfigModal();
            this.isLoading = false;
            this.shouldScroll = true;
          },
        });
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  sendMessage() {
    const text = this.inputText.trim();
    if (!text || this.isLoading || !this.canUseAiAssistant) return;

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