import { inject, Injectable, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthStore } from '../stores/auth.store';
import { AiStreamChunkDto, UserChatMessage } from '../models/user-chat-message';

@Injectable({ providedIn: 'root' })
export class AiSignalrService implements OnDestroy {
  private authStore = inject(AuthStore);
  private hubConnection: signalR.HubConnection | null = null;

  streamChunkReceived$ = new Subject<AiStreamChunkDto>();
  isConnected$ = new BehaviorSubject<boolean>(false);

  async startConnection(): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) return;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.hubUrl}/hubs/ai`, {
        accessTokenFactory: () => this.authStore.token() ?? '',
      })
      .withAutomaticReconnect()
      .build();

    this.registerHandlers();

    try {
      await this.hubConnection.start();
      this.isConnected$.next(true);
    } catch (err) {
      console.error('❌ AI SignalR connection error:', err);
      this.isConnected$.next(false);
    }
  }

  async stopConnection(): Promise<void> {
    if (this.hubConnection) {
      await this.hubConnection.stop();
      this.isConnected$.next(false);
    }
  }

  async sendAiMessage(message: UserChatMessage): Promise<void> {
    try {
      await this.startConnection();
      await this.waitForConnected();
      await this.hubConnection?.invoke('SendAiMessage', message);
    } catch (err) {
      console.error('❌ sendAiMessage error:', err);
      throw err;
    }
  }

  private async waitForConnected(timeoutMs = 10000): Promise<void> {
    const isConnected = this.hubConnection?.state === signalR.HubConnectionState.Connected;
    if (isConnected) return;

    return new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        subscription.unsubscribe();
        reject(new Error('AI SignalR connection did not reach Connected state within timeout'));
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

  private registerHandlers(): void {
    if (!this.hubConnection) return;

    this.hubConnection.on('ReceiveAiStreamChunk', (chunk: AiStreamChunkDto) => {
      this.streamChunkReceived$.next(chunk);
    });

    this.hubConnection.onreconnected(() => {
      this.isConnected$.next(true);
    });

    this.hubConnection.onreconnecting(() => {
      this.isConnected$.next(false);
    });
  }

  ngOnDestroy(): void {
    this.stopConnection();
  }
}
