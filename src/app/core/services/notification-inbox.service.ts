import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { TokenStorageService } from '../auth/token-storage.service';
import { Page } from '../models/page.model';
import { AppNotification, NotificationAction } from '../models/notification.model';
import { NotificationService } from './notification.service';

const PAGE_SIZE = 20;

@Injectable({ providedIn: 'root' })
export class NotificationInboxService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly router = inject(Router);
  private readonly toast = inject(NotificationService);
  private readonly baseUrl = `${environment.apiUrl}/notifications`;

  readonly notifications = signal<AppNotification[]>([]);
  readonly unreadCount = signal<number>(0);
  readonly panelOpen = signal(false);
  readonly loading = signal(false);
  readonly hasMore = signal(true);

  private currentPage = 0;
  private eventSource: EventSource | null = null;

  constructor() {
    effect(() => {
      const user = this.auth.user();
      if (user) {
        this.refresh();
        this.connectSSE();
        this.checkOverdueTasks(user.id);
      } else {
        this.disconnect();
        this.notifications.set([]);
        this.unreadCount.set(0);
      }
    });
  }

  /** Resets list and reloads from page 0. Called on login and on panel open. */
  refresh(): void {
    this.currentPage = 0;
    this.notifications.set([]);
    this.hasMore.set(true);
    this.loadPage();
    this.loadUnreadCount();
  }

  /** Load the next page — called by scroll sentinel. */
  loadMore(): void {
    if (!this.hasMore() || this.loading()) return;
    this.loadPage();
  }

  markRead(id: string): void {
    const n = this.notifications().find(n => n.id === id);
    if (!n || n.read) return;
    this.http.post(`${this.baseUrl}/${id}/read`, {}).subscribe({
      next: () => {
        this.notifications.update(list => list.map(n => n.id === id ? { ...n, read: true } : n));
        this.unreadCount.update(c => Math.max(0, c - 1));
      },
      error: () => {},
    });
  }

  markAllRead(): void {
    this.http.post(`${this.baseUrl}/read-all`, {}).subscribe({
      next: () => {
        this.notifications.update(list => list.map(n => ({ ...n, read: true })));
        this.unreadCount.set(0);
      },
      error: () => {},
    });
  }

  handleAction(action: NotificationAction, event: Event): void {
    event.stopPropagation();
    if (action.actionType === 'NAVIGATE') {
      this.router.navigateByUrl(action.payload);
      this.closePanel();
    } else if (action.actionType === 'NAVIGATE_NEW_TAB') {
      window.open(action.payload, '_blank');
      this.closePanel();
    } else if (action.actionType === 'DISMISS') {
      this.closePanel();
    }
  }

  navigateTo(url: string): void {
    this.router.navigateByUrl(url);
    this.closePanel();
  }

  togglePanel(): void {
    if (!this.panelOpen()) this.refresh();
    this.panelOpen.update(v => !v);
  }

  closePanel(): void {
    this.panelOpen.set(false);
  }

  private loadPage(): void {
    this.loading.set(true);
    this.http
      .get<Page<AppNotification>>(`${this.baseUrl}?page=${this.currentPage}&size=${PAGE_SIZE}`)
      .subscribe({
        next: page => {
          this.notifications.update(list => [...list, ...page.content]);
          this.currentPage++;
          this.hasMore.set(!page.last);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  private loadUnreadCount(): void {
    this.http.get<{ count: number }>(`${this.baseUrl}/unread-count`).subscribe({
      next: res => this.unreadCount.set(res.count),
      error: () => {},
    });
  }

  private connectSSE(): void {
    this.disconnect();
    const token = this.tokenStorage.read()?.token;
    if (!token) return;
    const url = `${this.baseUrl}/sse?token=${encodeURIComponent(token)}`;
    this.eventSource = new EventSource(url);
    this.eventSource.addEventListener('notification', (event: MessageEvent) => {
      try {
        const incoming: AppNotification = JSON.parse(event.data);
        // Prepend to list (visible immediately if panel is open)
        this.notifications.update(list => [incoming, ...list]);
        this.unreadCount.update(c => c + 1);
        // Show ephemeral toast alert
        const toastMsg = `${incoming.system}: ${incoming.title}`;
        if (incoming.level === 'ERROR') this.toast.error(incoming.message ?? toastMsg, incoming.title);
        else if (incoming.level === 'WARNING') this.toast.warn(incoming.message ?? toastMsg, incoming.title);
        else if (incoming.level === 'SUCCESS') this.toast.success(incoming.message ?? toastMsg, incoming.title);
        else this.toast.info(incoming.message ?? toastMsg, incoming.title);
      } catch {
        // ignore malformed events
      }
    });
    this.eventSource.onerror = () => {
      this.disconnect();
      setTimeout(() => { if (this.auth.user()) this.connectSSE(); }, 5000);
    };
  }

  private checkOverdueTasks(userId: string): void {
    const today = new Date().toISOString().slice(0, 10);
    const key = `overdue_checked_${userId}_${today}`;
    if (localStorage.getItem(key)) return;
    const tareasBase = this.baseUrl.replace('/notifications', '/tareas');
    this.http.get<{ id: string; titulo: string }[]>(`${tareasBase}/vencidas`).subscribe({
      next: (tasks) => {
        localStorage.setItem(key, '1');
        if (!tasks.length) return;
        this.playAlertSound();
        const count = tasks.length;
        const route = count === 1
          ? `/tasks?vencidas=true&detalle=${tasks[0].id}`
          : `/tasks?vencidas=true`;
        const detail = count === 1
          ? `"${tasks[0].titulo}" venció sin completar — haz clic para verla`
          : `${count} tareas vencidas pendientes — haz clic para verlas`;
        this.toast.warnNav(detail, route, 'Tareas vencidas');
      },
      error: () => {},
    });
  }

  private playAlertSound(): void {
    try {
      const ctx = new AudioContext();
      [880, 1100, 1320].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        const t = ctx.currentTime + i * 0.18;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.25, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
      });
    } catch { /* blocked by browser autoplay policy */ }
  }

  private disconnect(): void {
    this.eventSource?.close();
    this.eventSource = null;
  }
}
