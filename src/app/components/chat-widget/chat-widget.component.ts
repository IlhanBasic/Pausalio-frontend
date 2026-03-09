import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  AfterViewChecked,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ChatService } from '../../services/chat.service';
import { ChatSignalrService } from '../../services/chat-signalr.service';
import { AuthStore } from '../../stores/auth.store';
import { BusinessMemberDto, ChatMessageDto, MessageStatus } from '../../models/chat';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './chat-widget.component.html',
  styleUrl: './chat-widget.component.css',
})
export class ChatWidgetComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  private chatService = inject(ChatService);
  private signalrService = inject(ChatSignalrService);
  private authStore = inject(AuthStore);
  private toastr = inject(ToastrService);
  private translate = inject(TranslateService);

  isOpen = false;
  members: BusinessMemberDto[] = [];
  selectedMember: BusinessMemberDto | null = null;
  messages: ChatMessageDto[] = [];
  inputText = '';
  unreadCount = 0;
  isLoadingHistory = false;
  isConnected = false;
  private shouldScroll = false;
  private subscriptions = new Subscription();

  async ngOnInit(): Promise<void> {
    await this.signalrService.startConnection();

    this.subscriptions.add(
      this.signalrService.isConnected$.subscribe((connected) => {
        this.isConnected = connected;
        if (!connected) {
          console.warn('⚠️ SignalR nije povezan');
        }
      }),
    );

    this.loadMembers();
    this.loadUnreadCount();
    this.subscribeToSignalR();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.signalrService.stopConnection();
  }

  private subscribeToSignalR(): void {
    this.subscriptions.add(
      this.signalrService.messageReceived$.subscribe((message) => {
        if (
          this.selectedMember &&
          (message.senderId === this.selectedMember.userId ||
            message.receiverId === this.selectedMember.userId)
        ) {
          // Izbjegni duplikate
          if (!this.messages.find((m) => m.id === message.id)) {
            this.messages.push(message);
            this.shouldScroll = true;
          }

          if (message.senderId === this.selectedMember.userId) {
            this.markAsRead();
          }
        }
      }),
    );

    this.subscriptions.add(
      this.signalrService.newMessageNotification$.subscribe((message) => {
        if (!this.isOpen || message.senderId !== this.selectedMember?.userId) {
          this.unreadCount++;
        }
      }),
    );

    this.subscriptions.add(
      this.signalrService.messagesRead$.subscribe(() => {
        this.messages = this.messages.map((m) => ({
          ...m,
          status: MessageStatus.Read,
        }));
      }),
    );
  }

  private loadMembers(): void {
    this.chatService.getMembers().subscribe({
      next: (members) => (this.members = members),
      error: (err) => {
        console.error('Error loading members:', err);
        this.toastr.error(
          this.translate.instant('CHAT.ERRORS.LOAD_MEMBERS'),
          this.translate.instant('COMMON.ERROR')
        );
      },
    });
  }

  private loadUnreadCount(): void {
    this.chatService.getUnreadCount().subscribe({
      next: ({ count }) => (this.unreadCount = count),
    });
  }

  toggleWidget(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.unreadCount > 0) {
      this.unreadCount = 0;
    }
  }

  selectMember(member: BusinessMemberDto): void {
    if (this.selectedMember) {
      this.signalrService.leaveChat(
        this.selectedMember.userId,
        this.authStore.currentBusinessId()!,
      );
    }

    this.selectedMember = member;
    this.messages = [];
    this.isLoadingHistory = true;

    const businessId = this.authStore.currentBusinessId()!;
    this.signalrService.joinChat(member.userId, businessId);

    this.chatService.getHistory(member.userId).subscribe({
      next: (messages) => {
        this.messages = messages;
        this.isLoadingHistory = false;
        this.shouldScroll = true;
        this.markAsRead();
      },
      error: (err) => {
        console.error('Error loading history:', err);
        this.toastr.error(
          this.translate.instant('CHAT.ERRORS.LOAD_HISTORY'),
          this.translate.instant('COMMON.ERROR')
        );
        this.isLoadingHistory = false;
      },
    });
  }

  async sendMessage(): Promise<void> {
    const text = this.inputText.trim();
    if (!text || !this.selectedMember) return;

    if (!this.isConnected) {
      console.warn('⚠️ SignalR nije povezan, pokušavam ponovo...');
      this.toastr.warning(
        this.translate.instant('CHAT.ERRORS.CONNECTION_FAILED'),
        this.translate.instant('COMMON.WARNING')
      );
      await this.signalrService.startConnection();
    }

    const businessId = this.authStore.currentBusinessId()!;
    this.inputText = '';

    try {
      await this.signalrService.sendMessage(this.selectedMember.userId, businessId, text);
    } catch (err) {
      console.error('Error sending message:', err);
      this.toastr.error(
        this.translate.instant('CHAT.ERRORS.SEND_MESSAGE'),
        this.translate.instant('COMMON.ERROR')
      );
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  backToMembers(): void {
    if (this.selectedMember) {
      this.signalrService.leaveChat(
        this.selectedMember.userId,
        this.authStore.currentBusinessId()!,
      );
    }
    this.selectedMember = null;
    this.messages = [];
  }

  private markAsRead(): void {
    if (!this.selectedMember) return;
    const businessId = this.authStore.currentBusinessId()!;
    this.signalrService.markAsRead(this.selectedMember.userId, businessId);
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  isMyMessage(message: ChatMessageDto): boolean {
    return message.senderId === this.authStore.user()?.id;
  }

  formatTime(date: Date): string {
    return this.translate.instant('CHAT.MESSAGE.SENT_AT', {
      time: new Date(date).toLocaleTimeString(this.translate.currentLang === 'sr-Cyrl' ? 'sr-Cyrl-RS' : 'sr-Latn-RS', {
        hour: '2-digit',
        minute: '2-digit',
      })
    });
  }

  getStatusIcon(status: MessageStatus): string {
    switch (status) {
      case MessageStatus.Read:
        return this.translate.instant('CHAT.MESSAGE.STATUS_READ');
      case MessageStatus.Delivered:
        return this.translate.instant('CHAT.MESSAGE.STATUS_DELIVERED');
      case MessageStatus.Sent:
        return this.translate.instant('CHAT.MESSAGE.STATUS_SENT');
      default:
        return '';
    }
  }

  getInitials(fullName: string): string {
    return fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }
}