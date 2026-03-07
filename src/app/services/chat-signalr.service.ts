import { inject, Injectable, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { ChatMessageDto } from '../models/chat';
import { AuthStore } from '../stores/auth.store';

@Injectable({ providedIn: 'root' })
export class ChatSignalrService implements OnDestroy {
  private authStore = inject(AuthStore);
  private hubConnection: signalR.HubConnection | null = null;

  messageReceived$ = new Subject<ChatMessageDto>();
  newMessageNotification$ = new Subject<ChatMessageDto>();
  messagesRead$ = new Subject<{ readBy: string; businessId: string }>();
  isConnected$ = new BehaviorSubject<boolean>(false);

  async startConnection(): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) return;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.hubUrl}/hubs/chat`, {
        accessTokenFactory: () => this.authStore.token() ?? ''
      })
      .withAutomaticReconnect()
      .build();

    this.registerHandlers();

    try {
      await this.hubConnection.start();
      this.isConnected$.next(true);
      console.log('✅ SignalR connected, state:', this.hubConnection.state);
    } catch (err) {
      console.error('❌ SignalR connection error:', err);
      this.isConnected$.next(false);
    }
  }

  async stopConnection(): Promise<void> {
    if (this.hubConnection) {
      await this.hubConnection.stop();
      this.isConnected$.next(false);
    }
  }

  async joinChat(otherUserId: string, businessId: string): Promise<void> {
    console.log('🔗 joinChat, state:', this.hubConnection?.state, '| otherUserId:', otherUserId, '| businessId:', businessId);
    try {
      await this.hubConnection?.invoke('JoinChat', otherUserId, businessId);
      console.log('✅ joinChat uspešno');
    } catch (err) {
      console.error('❌ joinChat error:', err);
    }
  }

  async leaveChat(otherUserId: string, businessId: string): Promise<void> {
    try {
      await this.hubConnection?.invoke('LeaveChat', otherUserId, businessId);
    } catch (err) {
      console.error('❌ leaveChat error:', err);
    }
  }

  private async waitForConnected(timeoutMs = 10000): Promise<void> {
    const isConnected = this.hubConnection?.state === signalR.HubConnectionState.Connected;
    if (isConnected) return;

    return new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        subscription.unsubscribe();
        reject(new Error('SignalR connection did not reach Connected state within timeout'));
      }, timeoutMs);

      const subscription = this.isConnected$.subscribe((connected) => {
        if (connected) {
          window.clearTimeout(timeout);
          subscription.unsubscribe();
          resolve();
        }
      });
    });
  }

  async sendMessage(receiverId: string, businessId: string, content: string): Promise<void> {
    console.log('📨 sendMessage, state:', this.hubConnection?.state, '| receiverId:', receiverId, '| businessId:', businessId, '| content:', content);

    try {
      await this.startConnection();
      await this.waitForConnected();
      await this.hubConnection?.invoke('SendMessage', receiverId, businessId, content);
      console.log('✅ sendMessage uspešno');
    } catch (err) {
      console.error('❌ sendMessage error:', err);
    }
  }

  async markAsRead(senderId: string, businessId: string): Promise<void> {
    try {
      await this.startConnection();
      await this.waitForConnected();
      await this.hubConnection?.invoke('MarkAsRead', senderId, businessId);
    } catch (err) {
      console.error('❌ markAsRead error:', err);
    }
  }

  private registerHandlers(): void {
    if (!this.hubConnection) return;

    this.hubConnection.on('ReceiveMessage', (message: ChatMessageDto) => {
      console.log('📩 ReceiveMessage:', message);
      this.messageReceived$.next(message);
    });

    this.hubConnection.on('NewMessageNotification', (message: ChatMessageDto) => {
      console.log('🔔 NewMessageNotification:', message);
      this.newMessageNotification$.next(message);
    });

    this.hubConnection.on('MessagesRead', (data: { readBy: string; businessId: string }) => {
      console.log('👁️ MessagesRead:', data);
      this.messagesRead$.next(data);
    });

    this.hubConnection.onreconnected(() => {
      console.log('🔄 SignalR reconnected');
      this.isConnected$.next(true);
    });

    this.hubConnection.onreconnecting(() => {
      console.log('⏳ SignalR reconnecting...');
      this.isConnected$.next(false);
    });
  }

  ngOnDestroy(): void {
    this.stopConnection();
  }
}