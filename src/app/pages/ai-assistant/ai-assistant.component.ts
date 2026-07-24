import { Component, inject, AfterViewChecked, ElementRef, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AiAssistantService } from '../../services/ai-assistant.service';
import { AIResponseDto, ChatHistoryItem, UserChatMessage, AiStreamChunkDto } from '../../models/user-chat-message';
import { ToastrService } from 'ngx-toastr';
import { UserProfileStore } from '../../stores/user-profile.store';
import { UserProfileService } from '../../services/user-profile.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './ai-assistant.component.html',
  styleUrl: './ai-assistant.component.css',
})
export class AiAssistantComponent implements AfterViewChecked, OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  private aiService = inject(AiAssistantService);
  private translate = inject(TranslateService);
  private userProfileStore = inject(UserProfileStore);
  private userProfileService = inject(UserProfileService);
  private fb = inject(FormBuilder);
  private toastr = inject(ToastrService);
  private destroy$ = new Subject<void>();

  messages: ChatMessage[] = [
    {
      role: 'assistant',
      content: this.translate.instant('AI_ASSISTANT.WELCOME_MESSAGE'),
      timestamp: new Date(),
    },
  ];

  inputText = '';
  isLoading = false;
  isLoadingMessages = false;
  isLoadingConversations = false;
  showAiConfigModal = false;
  isStreaming = false;
  private shouldScroll = false;
  activeConversationId: string | null = null;
  conversations: ChatConversation[] = [];
  sidebarCollapsed = false; // desktop collapse
  sidebarOpen = false; // mobile overlay open

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

  get activeConversationTitle(): string {
    const active = this.conversations.find((conversation) => conversation.id === this.activeConversationId);
    return active?.title ?? this.translate.instant('AI_ASSISTANT.NEW_CHAT');
  }

  ngOnInit() {
    this.loadConversations();
    // Subscribe to stream chunks globally
    this.aiService
      .getStreamChunks()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chunk) => this.handleStreamChunk(chunk),
        error: (err) => this.handleStreamError(err),
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidebar() {
    try {
      if (window.innerWidth <= 768) {
        this.sidebarOpen = !this.sidebarOpen;
      } else {
        this.sidebarCollapsed = !this.sidebarCollapsed;
      }
    } catch {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    }
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

  loadConversations() {
    this.isLoadingConversations = true;
    this.aiService.getConversations().subscribe({
      next: (response) => {
        this.conversations = response
          .filter((conversation) => !!conversation.id)
          .map((conversation) => ({
            id: conversation.id ?? '',
            title: conversation.title ?? this.translate.instant('AI_ASSISTANT.NEW_CHAT'),
            createdAt: conversation.createdAt ?? '',
            updatedAt: conversation.updatedAt ?? '',
          }))
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        this.isLoadingConversations = false;
      },
      error: () => {
        this.isLoadingConversations = false;
      },
    });
  }

  startNewChat() {
    this.activeConversationId = null;
    this.messages = [
      {
        role: 'assistant',
        content: this.translate.instant('AI_ASSISTANT.WELCOME_MESSAGE'),
        timestamp: new Date(),
      },
    ];
    this.shouldScroll = true;
  }

  selectConversation(conversation: ChatConversation) {
    if (this.isLoadingMessages || this.isLoading) {
      return;
    }

    if (conversation.id === this.activeConversationId) {
      return;
    }

    this.activeConversationId = conversation.id;
    this.isLoadingMessages = true;
    this.aiService.getConversationMessages(conversation.id).subscribe({
      next: (response) => {
        this.messages = response.map((item) => ({
          role: item.role === 'user' ? 'user' : 'assistant',
          content: item.content ?? '',
          timestamp: item.createdAt ? new Date(item.createdAt) : new Date(),
        }));
        this.isLoadingMessages = false;
        this.shouldScroll = true;
      },
      error: () => {
        this.isLoadingMessages = false;
      },
    });
  }

  deleteConversation(conversation: ChatConversation, event: MouseEvent) {
    event.stopPropagation();
    if (!confirm(this.translate.instant('AI_ASSISTANT.DELETE_CONVERSATION_CONFIRM'))) {
      return;
    }

    this.aiService.deleteConversation(conversation.id).subscribe({
      next: () => {
        if (this.activeConversationId === conversation.id) {
          this.startNewChat();
        }
        this.loadConversations();
      },
      error: () => {
        // optional error handling
      },
    });
  }

  sendMessage() {
    const text = this.inputText.trim();
    if (!text || this.isLoading || !this.canUseAiAssistant) return;

    this.messages.push({ role: 'user', content: text, timestamp: new Date() });
    this.inputText = '';
    this.isLoading = true;
    this.isStreaming = true;
    this.shouldScroll = true;

    // Add placeholder for assistant message that will be filled via streaming
    const assistantMessageIndex = this.messages.length;
    this.messages.push({
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    });

    const history: ChatHistoryItem[] = this.getChatHistory();

    const payload: UserChatMessage = { message: text, history };
    if (this.activeConversationId) {
      payload.conversationId = this.activeConversationId;
    }

    this.aiService.sendMessageStream(payload).catch((err) => {
      console.error('❌ Failed to send message via SignalR:', err);
      this.isLoading = false;
      this.isStreaming = false;
      this.messages[assistantMessageIndex].content = this.translate.instant('AI_ASSISTANT.ERROR_MESSAGE');
      this.messages[assistantMessageIndex].isStreaming = false;
      this.shouldScroll = true;
      this.toastr.error(err?.message || this.translate.instant('AI_ASSISTANT.ERROR_MESSAGE'), this.translate.instant('COMMON.ERROR'));
    });
  }

  /**
   * Handle incoming stream chunks from SignalR
   */
  private handleStreamChunk(chunk: AiStreamChunkDto) {
    // Find or create the active assistant message
    let assistantMessage = this.messages[this.messages.length - 1];

    if (assistantMessage?.role !== 'assistant' || !assistantMessage.isStreaming) {
      // Create new assistant message if the last one isn't streaming
      assistantMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };
      this.messages.push(assistantMessage);
    }

    // Handle different chunk types
    if (chunk.type === 'error') {
      assistantMessage.content = chunk.content || this.translate.instant('AI_ASSISTANT.ERROR_MESSAGE');
      assistantMessage.isStreaming = false;
      this.isStreaming = false;
      this.isLoading = false;
      this.toastr.error(chunk.content || this.translate.instant('AI_ASSISTANT.ERROR_MESSAGE'), this.translate.instant('COMMON.ERROR'));
    } else if (chunk.type === 'content' && chunk.content) {
      // Append chunk content to the assistant message
      assistantMessage.content += chunk.content;
      this.shouldScroll = true;
    }

    // Check if this is the final chunk
    if (chunk.isFinal) {
      assistantMessage.isStreaming = false;
      this.isStreaming = false;
      this.isLoading = false;

      // Update conversation ID if provided
      if (chunk.conversationId && !this.activeConversationId) {
        const isNew = this.activeConversationId !== chunk.conversationId;
        this.activeConversationId = chunk.conversationId;
        if (isNew) {
          this.loadConversations();
        }
      }

      // Log usage stats if provided
      if (chunk.usage) {
        console.log('📊 AI Usage Stats:', chunk.usage);
      }
    }
  }

  /**
   * Handle stream errors
   */
  private handleStreamError(err: any) {
    console.error('❌ Stream error:', err);
    this.isLoading = false;
    this.isStreaming = false;

    const errorMessage = err?.message || this.translate.instant('AI_ASSISTANT.ERROR_MESSAGE');
    this.toastr.error(errorMessage, this.translate.instant('COMMON.ERROR'));

    // Update last message with error state
    if (this.messages.length > 0) {
      const lastMessage = this.messages[this.messages.length - 1];
      if (lastMessage.role === 'assistant' && lastMessage.isStreaming) {
        lastMessage.content = errorMessage;
        lastMessage.isStreaming = false;
      }
    }
  }

  private getChatHistory(): ChatHistoryItem[] {
    const currentMessages = this.messages;
    const withoutCurrentUserMessage = currentMessages.slice(0, -1);
    const hasWelcomeMessage =
      withoutCurrentUserMessage.length > 0 &&
      withoutCurrentUserMessage[0].role === 'assistant' &&
      withoutCurrentUserMessage[0].content === this.translate.instant('AI_ASSISTANT.WELCOME_MESSAGE');

    const historySource = hasWelcomeMessage ? withoutCurrentUserMessage.slice(1) : withoutCurrentUserMessage;
    return historySource
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat() {
    this.startNewChat();
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
      minute: '2-digit',
    });
  }

  formatConversationDate(dateString: string): string {
    if (!dateString) {
      return '';
    }
    const date = new Date(dateString);
    return date.toLocaleDateString(this.translate.currentLang === 'sr-Cyrl' ? 'sr-Cyrl-RS' : 'sr-Latn-RS', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  formatContent(content: string): string {
    return content.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  }
}